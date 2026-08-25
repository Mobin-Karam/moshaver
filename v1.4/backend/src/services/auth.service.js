"use strict";

function createAuthService(deps) {
  var db = deps.db;
  var env = deps.env;
  var security = deps.security;
  var now = deps.now;
  var audit = deps.audit;
  var clientIp = deps.clientIp;
  var userAgent = deps.userAgent;
  var parseCookies = deps.parseCookies;
  var setSessionCookie = deps.setSessionCookie;
  var clearSessionCookie = deps.clearSessionCookie;
  var cleanupSessions = deps.cleanupSessions;
  var loginKeys = deps.loginKeys;
  var isLoginBlocked = deps.isLoginBlocked;
  var loginFailure = deps.loginFailure;
  var loginSuccess = deps.loginSuccess;
  var ensureCsrf = deps.ensureCsrf;

  async function login(req, res, username, password) {
    var keys = loginKeys(req, username),
      blocked = isLoginBlocked(keys);
    if (blocked) {
      audit(null, "LOGIN_RATE_LIMITED", "auth", username, {
        ip: clientIp(req),
        blockedUntil: blocked,
      });
      return {
        error: {
          status: 429,
          code: "RATE_LIMITED",
          message: "تلاش‌های ورود بیش از حد است. چند دقیقه بعد دوباره تلاش کنید.",
          details: { blockedUntil: blocked },
        },
      };
    }
    var u = db
        .prepare("SELECT * FROM users WHERE username=? LIMIT 1")
        .get(username),
      verified =
        u && u.is_active
          ? await security.verifyPassword(password, u.password_hash)
          : { ok: false, needsRehash: false };
    if (!u || !u.is_active || !verified.ok) {
      loginFailure(keys);
      audit(u || null, "LOGIN_FAILURE", "auth", username, {
        ip: clientIp(req),
        userAgent: userAgent(req),
      });
      return {
        error: {
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "نام کاربری یا رمز عبور نادرست است.",
        },
      };
    }
    loginSuccess(keys);
    cleanupSessions();
    var previousCookie = parseCookies(req)[env.sessionCookieName] || "";
    if (previousCookie) {
      try {
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
          security.hashToken(previousCookie),
        );
      } catch (e) {
        console.error("previous session cleanup failed:", e.message);
      }
    }
    if (verified.needsRehash) {
      try {
        db.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").run(
          await security.hashPassword(password),
          now(),
          u.id,
        );
      } catch (e) {
        console.error("password rehash failed:", e.message);
      }
    }
    var raw = security.newSessionToken(),
      csrf = security.newCsrfToken(),
      created = new Date(),
      ttlMs =
        u.role === "admin"
          ? env.sessionHoursAdmin * 3600000
          : env.sessionDaysStudent * 86400000,
      expiry = new Date(created.getTime() + ttlMs),
      sessionId = security.id("session");
    db.prepare(
      "INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at,csrf_hash,csrf_token,ip_address,user_agent) VALUES (?,?,?,?,?,?,?,?,?,?)",
    ).run(
      sessionId,
      u.id,
      security.hashToken(raw),
      expiry.toISOString(),
      created.toISOString(),
      created.toISOString(),
      security.hashToken(csrf),
      csrf,
      clientIp(req),
      userAgent(req),
    );
    setSessionCookie(res, raw, Math.floor(ttlMs / 1000));
    audit(u, "LOGIN_SUCCESS", "user", u.id, {
      ip: clientIp(req),
      sessionId: sessionId,
    });
    return {
      data: {
        expiresAt: expiry.toISOString(),
        csrfToken: csrf,
        sessionId: sessionId,
        user: {
          id: u.id,
          username: u.username,
          role: u.role,
          displayName: u.display_name,
          studentId: u.student_id,
        },
      },
    };
  }

  function logout(req, res) {
    var raw = parseCookies(req)[env.sessionCookieName] || "",
      row = null;
    if (raw) {
      var hash = security.hashToken(raw);
      row = db
        .prepare(
          "SELECT s.id AS session_id,u.id,u.username,u.role,u.display_name,u.student_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? LIMIT 1",
        )
        .get(hash);
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash);
    }
    clearSessionCookie(res);
    if (row) audit(row, "LOGOUT", "user", row.id, { sessionId: row.session_id });
    return { loggedOut: true };
  }

  function me(user) {
    var csrf = ensureCsrf(user.session_id);
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
      studentId: user.student_id,
      csrfToken: csrf,
      sessionId: user.session_id,
      sessionExpiresAt: user.expires_at,
    };
  }

  async function changePassword(user, current, next) {
    var row = db.prepare("SELECT * FROM users WHERE id=?").get(user.id),
      verified = await security.verifyPassword(current, row.password_hash);
    if (!verified.ok) {
      return {
        error: {
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "رمز فعلی درست نیست.",
        },
      };
    }
    var hash = await security.hashPassword(next);
    db.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").run(
      hash,
      now(),
      user.id,
    );
    db.prepare("DELETE FROM sessions WHERE user_id=? AND id<>?").run(
      user.id,
      user.session_id,
    );
    audit(user, "PASSWORD_CHANGED", "user", user.id, {});
    return { data: { changed: true, otherSessionsRevoked: true } };
  }

  function listSessions(user) {
    return db
      .prepare(
        "SELECT id,expires_at AS expiresAt,created_at AS createdAt,last_seen_at AS lastSeenAt,ip_address AS ipAddress,user_agent AS userAgent FROM sessions WHERE user_id=? ORDER BY last_seen_at DESC",
      )
      .all(user.id)
      .map(function (x) {
        x.current = x.id === user.session_id;
        return x;
      });
  }

  function revokeSession(user, sessionId) {
    if (sessionId === user.session_id) {
      return {
        error: {
          status: 400,
          code: "CURRENT_SESSION",
          message: "برای خروج از نشست فعلی از دکمه خروج استفاده کنید.",
        },
      };
    }
    var r = db
      .prepare("DELETE FROM sessions WHERE id=? AND user_id=?")
      .run(sessionId, user.id);
    audit(user, "SESSION_REVOKED", "session", sessionId, {});
    return { data: { revoked: !!r.changes } };
  }

  return {
    login: login,
    logout: logout,
    me: me,
    changePassword: changePassword,
    listSessions: listSessions,
    revokeSession: revokeSession,
  };
}

module.exports = createAuthService;
