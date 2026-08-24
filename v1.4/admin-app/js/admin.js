(function (global) {
  "use strict";
  var state = global.MoshaverAdminState.create();
  var AUTH_SIGNAL_KEY = "moshaver_admin_auth_signal";
  var UI = global.MoshaverUI,
    Dates = global.MoshaverAdminDates,
    Modal = global.MoshaverAdminModal,
    Forms = global.MoshaverAdminForms,
    Connectivity = global.MoshaverAdminConnectivity;
  function el(id) {
    return UI.el(id);
  }
  function q(s, r) {
    return UI.q(s, r);
  }
  function qa(s, r) {
    return UI.qa(s, r);
  }
  function esc(v) {
    return UI.esc(v);
  }
  function icon(n) {
    return UI.icon(n);
  }
  var today = Dates.today,
    shift = Dates.shift,
    firstOfMonth = Dates.firstOfMonth,
    lastOfMonth = Dates.lastOfMonth,
    startWeek = Dates.startWeek,
    fa = Dates.faNum;
  function toast(msg, type) {
    return UI.toast(msg, type);
  }
  var openModal = Modal.openHtml,
    closeModal = Modal.close,
    setButtonBusy = Forms.setButtonBusy,
    autoGrow = Forms.autoGrow;
  function openImport() {
    var st = selectedStudent();
    state.importData = null;
    state.importPreview = null;
    el("jsonText").value = "";
    el("importPreview").innerHTML = "";
    el("importPreview").className = "import-preview hidden";
    if (el("jsonFile")) el("jsonFile").value = "";
    if (el("importTargetStudent"))
      el("importTargetStudent").innerHTML =
        "<strong>دانش‌آموز مقصد:</strong> " +
        esc(st ? st.name : "—") +
        " <small>(" +
        esc(state.studentId || "") +
        ")</small>";
    Modal.openById("importModal");
  }
  function api(method, path, body, cb) {
    var epoch = state.authEpoch;
    return API.request(method, path, body, function (err, data, status) {
      if (epoch !== state.authEpoch) return;
      if (err) {
        Connectivity.set(err.status === 0 ? "offline" : "error");
      } else {
        Connectivity.set("online");
        state.lastSyncAt = Date.now();
      }
      if (cb) cb(err, data, status);
    });
  }
  var ReportsView = global.MoshaverAdminReports.create({
    state: state,
    api: api,
    el: el,
    esc: esc,
    fa: fa,
    toast: toast,
  });
  var StudentsView = global.MoshaverAdminStudents.create({
    state: state,
    api: api,
    el: el,
    esc: esc,
    toast: toast,
    loadStudents: loadStudents,
    switchView: switchView,
    selectConversationForStudent: selectConversationForStudent,
  });
  var SubjectsView = global.MoshaverAdminSubjects.create({
    state: state,
    api: api,
    el: el,
    q: q,
    qa: qa,
    esc: esc,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
  });
  var SystemView = global.MoshaverAdminSystem.create({
    api: api,
    el: el,
    qa: qa,
    esc: esc,
    fa: fa,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
  });
  var loadReports = ReportsView.load,
    loadStudentEditor = StudentsView.loadEditor,
    sendMessage = StudentsView.messageActiveStudent;
  var loadSubjects = SubjectsView.load,
    newSubject = SubjectsView.createSubject;
  var loadSystem = SystemView.load,
    loadSessions = SystemView.loadSessions,
    openChangePassword = SystemView.openChangePassword;
  function showLogin(message) {
    el("loginScreen").className = "login-screen";
    el("app").className = "admin-shell hidden";
    stopLivePolling();
    stopChatPolling();
    disconnectEvents();
    var err = el("loginError"),
      btn = q('#loginForm button[type="submit"]');
    if (btn) btn.disabled = false;
    if (message) {
      err.textContent = message;
      err.className = "error";
    } else {
      err.textContent = "";
      err.className = "error hidden";
    }
  }
  function showApp() {
    el("loginScreen").className = "login-screen hidden";
    el("app").className = "admin-shell";
    var err = el("loginError");
    if (err) {
      err.textContent = "";
      err.className = "error hidden";
    }
  }
  function resetAdminState() {
    global.MoshaverAdminState.resetSessionData(state);
  }
  function hasPendingAdminLogout() {
    try {
      return sessionStorage.getItem("moshaver_admin_logout_pending") === "1";
    } catch (e) {
      return false;
    }
  }
  function setPendingAdminLogout(value) {
    try {
      if (value) sessionStorage.setItem("moshaver_admin_logout_pending", "1");
      else sessionStorage.removeItem("moshaver_admin_logout_pending");
    } catch (e) {}
  }
  function broadcastAdminAuth(kind) {
    try {
      localStorage.setItem(
        AUTH_SIGNAL_KEY,
        JSON.stringify({ kind: kind, at: Date.now() }),
      );
    } catch (e) {}
  }
  function finishAdminLogout(message, keepPending, skipBroadcast) {
    state.authStatus = "anonymous";
    state.authEpoch++;
    API.clearAuth();
    API.abortAll();
    stopLivePolling();
    stopChatPolling();
    disconnectEvents();
    resetAdminState();
    if (!keepPending) setPendingAdminLogout(false);
    el("password").value = "";
    showLogin(message || "با موفقیت خارج شدید.");
    if (!skipBroadcast) broadcastAdminAuth("logout");
  }
  function handleAuthFailure(err) {
    if (state.authStatus !== "authenticated") return;
    setPendingAdminLogout(false);
    finishAdminLogout(
      (err && err.message) || "نشست پایان یافته است. دوباره وارد شوید.",
      false,
      false,
    );
  }
  function flushPendingAdminLogout(done) {
    if (!hasPendingAdminLogout()) {
      if (done) done(null);
      return;
    }
    API.request(
      "POST",
      "/auth/logout",
      {},
      function (err) {
        if (err && err.status === 0) {
          if (done) done(err);
          return;
        }
        setPendingAdminLogout(false);
        API.clearAuth();
        if (done) done(null);
      },
      { suppressAuthFailure: true, noCsrfRetry: true },
    );
  }
  function clearWrongAdminRoleSession(message) {
    state.authStatus = "logging-out";
    setPendingAdminLogout(true);
    API.request(
      "POST",
      "/auth/logout",
      {},
      function (err) {
        finishAdminLogout(message, !!(err && err.status === 0), false);
      },
      { suppressAuthFailure: true, noCsrfRetry: true },
    );
  }
  function switchView(name) {
    var vs = qa(".view"),
      ns = qa(".nav");
    for (var i = 0; i < vs.length; i++) vs[i].classList.remove("active");
    for (i = 0; i < ns.length; i++) ns[i].classList.remove("active");
    var view = el("view-" + name);
    if (!view) return;
    if (view) view.classList.add("active");
    var n = q('.nav[data-view="' + name + '"]');
    if (n) n.classList.add("active");
    stopLivePolling();
    stopChatPolling();
    if (name === "dashboard") loadDashboard();
    if (name === "live") {
      loadLive();
      startLivePolling();
    }
    if (name === "chat") {
      loadChatList();
      startChatPolling();
    }
    if (name === "planner") loadPlanner();
    if (name === "exams") loadExams();
    if (name === "quizzes") loadQuizzes();
    if (name === "reports") loadReports();
    if (name === "students") loadStudentEditor();
    if (name === "subjects") loadSubjects();
    if (name === "system") loadSystem();
  }
  function loadStudents(done) {
    api("GET", "/admin/students", null, function (err, data) {
      if (err) {
        toast(err.message);
        return;
      }
      state.students = data || [];
      var sel = el("studentSelect"),
        h = "";
      for (var i = 0; i < state.students.length; i++)
        h +=
          '<option value="' +
          esc(state.students[i].id) +
          '">' +
          esc(state.students[i].name) +
          "</option>";
      sel.innerHTML = h;
      if (!state.studentId && state.students.length)
        state.studentId = state.students[0].id;
      if (state.studentId) sel.value = state.studentId;
      done && done();
    });
  }
  function selectedStudent() {
    for (var i = 0; i < state.students.length; i++)
      if (state.students[i].id === state.studentId) return state.students[i];
    return null;
  }
  function loadDashboard() {
    if (!state.studentId) return;
    api(
      "GET",
      "/admin/students/" + state.studentId + "/overview",
      null,
      function (err, o) {
        if (err) return toast(err.message);
        state.overview = o;
        api(
          "GET",
          "/admin/advisor-inbox?studentId=" + state.studentId,
          null,
          function (er, ib) {
            if (er) return toast(er.message);
            state.inbox = ib;
            api("GET", "/admin/chat/conversations", null, function (ce, cs) {
              if (!ce) {
                state.conversations = cs || [];
                renderConversationList();
                updateChatBadge();
              }
              renderDashboard();
            });
          },
        );
      },
    );
  }
  function openAdminNotifications() {
    if (!state.studentId) return;
    api(
      "GET",
      "/admin/advisor-inbox?studentId=" + encodeURIComponent(state.studentId),
      null,
      function (err, ib) {
        if (err) return toast(err.message, "error");
        state.inbox = ib || {};
        api("GET", "/admin/chat/conversations", null, function (ce, cs) {
          if (!ce) state.conversations = cs || [];
          var x = state.inbox || {},
            h =
              '<span class="eyebrow">NOTIFICATIONS</span><h2>اعلان‌های مشاور</h2><p class="modal-help">پیام‌ها و مواردی که برای دانش‌آموز فعال نیاز به تصمیم تو دارند.</p><div class="advisor-notification-list">',
            count = 0,
            i,
            chatN = 0;
          (x.issues || []).forEach(function (a) {
            count++;
            h += inboxItem(
              "alert",
              "گزارش مشکل: " + (a.subject || a.title || a.issue_type),
              a.note || a.issue_type,
              "issue",
              a.id,
            );
          });
          (x.recoveryRequests || []).forEach(function (a) {
            count++;
            h += inboxItem(
              "refresh",
              "درخواست ریکاوری",
              a.reason + " — " + (a.note || ""),
              "recovery",
              a.id,
            );
          });
          (x.reviews || []).forEach(function (a) {
            count++;
            h += inboxItem(
              "calendar",
              "مرور عقب‌افتاده: " + (a.subject || ""),
              a.description || "",
              "review",
              a.id,
            );
          });
          (x.missedTasks || []).forEach(function (a) {
            count++;
            h += inboxItem(
              "alert",
              "فعالیت انجام‌نشده: " + (a.subject || a.title || ""),
              a.planDate + " • " + a.start + " تا " + a.end,
              "missed",
              a.id,
            );
          });
          (x.examRetryRequests || []).forEach(function (a) {
            count++;
            h += inboxItem(
              "retry",
              "درخواست تلاش مجدد: " + (a.examTitle || "آزمون"),
              a.message || "دانش‌آموز یک تلاش دیگر می‌خواهد.",
              "exam-retry",
              a.id,
            );
          });
          for (i = 0; i < state.conversations.length; i++)
            if (
              state.conversations[i].student &&
              state.conversations[i].student.id === state.studentId
            )
              chatN = Number(state.conversations[i].unread || 0);
          if (chatN) {
            count += chatN;
            h += inboxItem(
              "message",
              fa(chatN) + " پیام خوانده‌نشده",
              "برای پاسخ، گفتگو را باز کن.",
              "chat",
              state.studentId,
            );
          }
          h +=
            (count
              ? ""
              : '<div class="empty-admin">اعلان جدیدی برای پیگیری وجود ندارد.</div>') +
            '</div><div class="modal-actions"><button id="openDashboardFromNotifications" class="btn soft">باز کردن صندوق مشاور</button></div>';
          openModal(h);
          var bs = qa("[data-inbox-action]", el("genericModalBody"));
          for (i = 0; i < bs.length; i++) bs[i].onclick = handleInboxAction;
          el("openDashboardFromNotifications").onclick = function () {
            closeModal();
            switchView("dashboard");
          };
        });
      },
    );
  }
  function renderDashboard() {
    var o = state.overview || {},
      m = o.todayMetrics || {},
      ib = state.inbox || {},
      issueN = (ib.issues || []).length,
      recoveryN = (ib.recoveryRequests || []).length,
      reviewN = (ib.reviews || []).length,
      missedN = (ib.missedTasks || []).length,
      retryN = (ib.examRetryRequests || []).length,
      chatN = 0;
    for (var ci = 0; ci < state.conversations.length; ci++)
      if (state.conversations[ci].student.id === state.studentId)
        chatN = Number(state.conversations[ci].unread || 0);
    var totalInbox = issueN + recoveryN + reviewN + missedN + retryN + chatN;
    el("inboxCount").textContent = fa(totalInbox);
    if (el("adminNotificationBadge")) {
      el("adminNotificationBadge").textContent = fa(totalInbox);
      el("adminNotificationBadge").className = totalInbox
        ? "top-notification-badge"
        : "top-notification-badge hidden";
    }
    el("dashboardStats").innerHTML =
      '<article class="stat-card"><span>اجرای امروز</span><strong>' +
      fa((m.doneTasks || 0) + (m.partialTasks || 0)) +
      "/" +
      fa(m.totalTasks || 0) +
      "</strong><small>" +
      fa(m.actualMinutes || 0) +
      ' دقیقه واقعی</small></article><article class="stat-card"><span>تست امروز</span><strong>' +
      fa(m.actualTests || 0) +
      "</strong><small>هدف " +
      fa(m.plannedTests || 0) +
      '</small></article><article class="stat-card"><span>موارد توجه</span><strong>' +
      fa(totalInbox) +
      '</strong><small>مشکل، مرور و ریکاوری</small></article><article class="stat-card"><span>اشتباهات ثبت‌شده</span><strong>' +
      fa(o.mistakeCount || 0) +
      "</strong><small>برای تحلیل علتی</small></article>";
    var h = "",
      i,
      x;
    (ib.issues || []).forEach(function (a) {
      h += inboxItem(
        "alert",
        "گزارش مشکل: " + (a.subject || a.title || a.issue_type),
        a.note || a.issue_type,
        "issue",
        a.id,
      );
    });
    (ib.recoveryRequests || []).forEach(function (a) {
      h += inboxItem(
        "refresh",
        "درخواست ریکاوری",
        a.reason + " — " + (a.note || ""),
        "recovery",
        a.id,
      );
    });
    (ib.reviews || []).forEach(function (a) {
      h += inboxItem(
        "calendar",
        "مرور عقب‌افتاده: " + (a.subject || ""),
        a.description || "",
        "review",
        a.id,
      );
    });
    (ib.missedTasks || []).forEach(function (a) {
      h += inboxItem(
        "alert",
        "انجام‌نشده: " + (a.subject || a.title || ""),
        a.planDate + " • " + a.start + " تا " + a.end,
        "missed",
        a.id,
      );
    });
    (ib.examRetryRequests || []).forEach(function (a) {
      h += inboxItem(
        "retry",
        "درخواست تلاش مجدد: " + (a.examTitle || "آزمون"),
        a.message || "دانش‌آموز درخواست یک تلاش دیگر داده است.",
        "exam-retry",
        a.id,
      );
    });
    if (chatN)
      h += inboxItem(
        "message",
        fa(chatN) + " پیام خوانده‌نشده",
        "دانش‌آموز پیام جدید فرستاده است.",
        "chat",
        state.studentId,
      );
    el("advisorInbox").innerHTML =
      h || '<div class="empty-admin">مورد فوری برای پیگیری وجود ندارد.</div>';
    var actions = qa("[data-inbox-action]");
    for (i = 0; i < actions.length; i++) actions[i].onclick = handleInboxAction;
    var st = o.student || {},
      next = o.nextExam;
    el("studentSnapshot").innerHTML =
      '<div class="snapshot-head"><div class="avatar">' +
      esc((st.name || "?").charAt(0)) +
      "</div><div><strong>" +
      esc(st.name || "") +
      "</strong><small>" +
      esc(st.grade || "") +
      " • " +
      esc(st.daily_capacity || st.dailyCapacity || "") +
      '</small></div></div><div class="snapshot-row"><span>هدف</span><strong>' +
      esc(st.target_major || "—") +
      " / " +
      esc(st.target_city || "—") +
      '</strong></div><div class="snapshot-row"><span>رتبه هدف</span><strong>' +
      esc(st.rank_goal || "—") +
      '</strong></div><div class="snapshot-row"><span>آزمون بعدی</span><strong>' +
      (next ? esc(next.title) + " • " + fa(next.readiness) + "%" : "—") +
      '</strong></div><div class="snapshot-row"><span>گزارش‌های اخیر</span><strong>' +
      fa((o.recentReports || []).length) +
      "</strong></div>";
  }
  function inboxItem(ic, title, desc, type, id) {
    return (
      '<div class="inbox-item"><span class="inbox-icon">' +
      icon(ic) +
      "</span><div><strong>" +
      esc(title) +
      "</strong><p>" +
      esc(desc) +
      '</p></div><div class="mini-actions">' +
      (type === "issue" ||
      type === "recovery" ||
      type === "chat" ||
      type === "exam-retry"
        ? '<button class="mini-btn" data-inbox-action="' +
          type +
          '" data-id="' +
          esc(id) +
          '">' +
          (type === "chat" ? "باز کردن" : "بررسی") +
          "</button>"
        : "") +
      "</div></div>"
    );
  }
  function handleInboxAction() {
    var type = this.getAttribute("data-inbox-action"),
      id = this.getAttribute("data-id");
    if (type === "issue") {
      openModal(
        '<span class="eyebrow">ISSUE</span><h2>پاسخ به مشکل</h2><label>یادداشت مشاور<textarea id="advisorIssueNote" rows="4"></textarea></label><div class="modal-actions"><button id="resolveIssueBtn" class="btn primary">حل شد + ارسال پاسخ</button><button id="dismissIssueBtn" class="btn soft">نادیده گرفتن</button></div>',
      );
      el("resolveIssueBtn").onclick = function () {
        resolveIssue(id, "resolved");
      };
      el("dismissIssueBtn").onclick = function () {
        resolveIssue(id, "dismissed");
      };
    } else if (type === "chat") {
      switchView("chat");
      setTimeout(function () {
        selectConversationForStudent(id);
      }, 80);
    } else if (type === "recovery") {
      openModal(
        '<h2>درخواست ریکاوری</h2><p>بعد از بررسی، می‌توانی برنامه را از برنامه‌ریز اصلاح کنی.</p><label>پیام برای دانش‌آموز<textarea id="recoveryMessage" rows="3">درخواستت بررسی شد؛ برنامه اصلاح‌شده را ببین.</textarea></label><button id="resolveRecoveryBtn" class="btn primary full">حل شد</button>',
      );
      el("resolveRecoveryBtn").onclick = function () {
        api(
          "PATCH",
          "/admin/recovery-requests/" + id,
          { status: "resolved", message: el("recoveryMessage").value },
          function (err) {
            if (err) return toast(err.message, "error");
            closeModal();
            loadDashboard();
          },
        );
      };
    } else if (type === "exam-retry") {
      switchView("exams");
      setTimeout(loadExamRetryRequests, 80);
    }
  }
  function resolveIssue(id, status) {
    api(
      "PATCH",
      "/admin/task-issues/" + id,
      {
        status: status,
        advisorNote: el("advisorIssueNote") ? el("advisorIssueNote").value : "",
      },
      function (err) {
        if (err) return toast(err.message);
        closeModal();
        loadDashboard();
      },
    );
  }
  function startLivePolling() {
    stopLivePolling();
    state.liveTimer = setInterval(loadLive, 15000);
    state.liveClock = setInterval(renderLiveTimer, 1000);
  }
  function stopLivePolling() {
    if (state.liveTimer) clearInterval(state.liveTimer);
    if (state.liveClock) clearInterval(state.liveClock);
    state.liveTimer = null;
    state.liveClock = null;
  }
  function loadLive() {
    if (!state.studentId) return;
    api(
      "GET",
      "/admin/live?studentId=" + state.studentId,
      null,
      function (err, data) {
        if (err) return;
        state.live = data;
        renderLive();
      },
    );
  }
  function renderLive() {
    var d = state.live || {},
      p = d.presence || {},
      ss = d.activeSession,
      s = d.student || {};
    el("liveDot").className = "live-dot " + (p.online ? "online" : "");
    var hero =
      '<div class="live-hero"><div class="live-status"><span class="pulse ' +
      (p.online ? "" : "offline") +
      '"></span><div><span class="eyebrow" style="color:#76e2d4">' +
      (p.online ? "ONLINE" : "OFFLINE") +
      "</span><h2>" +
      esc(s.name || "") +
      "</h2><p>" +
      (ss
        ? esc(
            (ss.subject ? ss.subject + " — " : "") +
              (ss.title || "در حال مطالعه"),
          )
        : "آخرین وضعیت: " + esc(p.state || "offline")) +
      '</p></div></div><div class="live-timer"><strong id="liveTimerText">' +
      (ss ? "00:00:00" : "--:--:--") +
      "</strong><small>" +
      (ss
        ? "شروع " + esc((ss.startedAt || "").slice(11, 16))
        : "آخرین فعالیت " + esc(p.lastSeenAt || "—")) +
      "</small></div></div>";
    el("liveHero").innerHTML = hero;
    renderLiveTimer();
    var h = "",
      acts = d.activity || [];
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      h +=
        '<div class="activity-row"><span class="activity-dot"></span><div><strong>' +
        esc(activityLabel(a.eventType)) +
        "</strong><p>" +
        esc(activityMeta(a)) +
        "</p><time>" +
        esc(a.createdAt || "") +
        "</time></div></div>";
    }
    el("activityFeed").innerHTML =
      h || '<div class="empty-admin">هنوز رویدادی ثبت نشده.</div>';
    h = "";
    (d.issues || []).forEach(function (x) {
      h +=
        '<div class="inbox-item"><span class="inbox-icon">' +
        icon("alert") +
        "</span><div><strong>" +
        esc(x.subject || x.title || x.issue_type) +
        "</strong><p>" +
        esc(x.note || x.issue_type) +
        '</p></div><button class="mini-btn" data-live-issue="' +
        esc(x.id) +
        '">پاسخ</button></div>';
    });
    el("liveIssues").innerHTML =
      h || '<div class="empty-admin">مشکل بازی وجود ندارد.</div>';
    var bs = qa("[data-live-issue]");
    for (i = 0; i < bs.length; i++)
      bs[i].onclick = function () {
        var id = this.getAttribute("data-live-issue");
        openModal(
          '<h2>پاسخ مشاور</h2><textarea id="liveIssueNote" rows="4"></textarea><button id="liveIssueSend" class="btn primary full">ارسال و بستن مشکل</button>',
        );
        el("liveIssueSend").onclick = function () {
          api(
            "PATCH",
            "/admin/task-issues/" + id,
            { status: "resolved", advisorNote: el("liveIssueNote").value },
            function (err) {
              if (err) return toast(err.message);
              closeModal();
              loadLive();
            },
          );
        };
      };
  }
  function renderLiveTimer() {
    if (!state.live || !state.live.activeSession || !el("liveTimerText"))
      return;
    var sec = Math.max(
        0,
        Math.floor(
          (Date.now() -
            new Date(state.live.activeSession.startedAt).getTime()) /
            1000,
        ),
      ),
      h = Math.floor(sec / 3600),
      m = Math.floor((sec % 3600) / 60),
      s = sec % 60;
    el("liveTimerText").textContent =
      ("0" + h).slice(-2) +
      ":" +
      ("0" + m).slice(-2) +
      ":" +
      ("0" + s).slice(-2);
  }
  function activityLabel(t) {
    var map = {
      "study.started": "شروع مطالعه",
      "study.finished": "پایان مطالعه",
      "task.done": "فعالیت انجام شد",
      "task.partial": "فعالیت نیمه‌کاره",
      "task.skipped": "فعالیت رد شد",
      "task.opened": "مشاهده فعالیت",
      "issue.created": "گزارش مشکل",
      "review.done": "مرور انجام شد",
      "quiz.started": "شروع آزمونک",
      "quiz.completed": "پایان آزمونک",
      "report.submitted": "گزارش شبانه",
      "recovery.requested": "درخواست ریکاوری",
    };
    return map[t] || t;
  }
  function activityMeta(a) {
    var m = a.metadata || {};
    if (m.actualMinutes) return fa(m.actualMinutes) + " دقیقه";
    if (m.percent != null) return fa(m.percent) + "٪";
    if (m.issueType) return m.issueType;
    return a.entityType || "";
  }
  function plannerRange() {
    var d = state.plannerDate || today();
    if (state.plannerMode === "day") return { from: d, to: d };
    if (state.plannerMode === "week") {
      var f = startWeek(d);
      return { from: f, to: shift(f, 6) };
    }
    return { from: firstOfMonth(d), to: lastOfMonth(d) };
  }
  function loadPlanner() {
    if (!state.studentId) return;
    el("plannerDate").value = state.plannerDate || today();
    var r = plannerRange();
    api(
      "GET",
      "/admin/plans?studentId=" +
        state.studentId +
        "&from=" +
        r.from +
        "&to=" +
        r.to,
      null,
      function (err, data) {
        if (err) return toast(err.message);
        state.plans = Array.isArray(data) ? data : data ? [data] : [];
        renderPlanner();
      },
    );
  }
  function planForDate(date) {
    for (var i = 0; i < state.plans.length; i++)
      if (state.plans[i].planDate === date) return state.plans[i];
    return null;
  }
  function renderPlanner() {
    renderPlannerWarnings();
    if (state.plannerMode === "day") renderDay();
    else if (state.plannerMode === "week") renderWeek();
    else renderMonth();
  }
  function renderPlannerWarnings() {
    var warnings = [];
    state.plans.forEach(function (p) {
      var mins = 0,
        tasks = p.tasks || [];
      for (var i = 0; i < tasks.length; i++) {
        mins += taskMinutes(tasks[i]);
        for (var j = i + 1; j < tasks.length; j++)
          if (tasks[i].start < tasks[j].end && tasks[j].start < tasks[i].end)
            warnings.push(
              p.planDate + ": تداخل " + tasks[i].start + " و " + tasks[j].start,
            );
        if (tasks[i].end > "22:30")
          warnings.push(p.planDate + ": فعالیت دیرهنگام تا " + tasks[i].end);
      }
      if (mins > 480)
        warnings.push(
          p.planDate +
            ": حجم برنامه بیش از ۸ ساعت (" +
            Math.round((mins / 60) * 10) / 10 +
            "h)",
        );
    });
    el("plannerWarnings").innerHTML = warnings.length
      ? '<div class="warning-box">⚠ ' +
        warnings.slice(0, 8).map(esc).join(" • ") +
        "</div>"
      : "";
  }
  function taskMinutes(t) {
    var a = t.start.split(":"),
      b = t.end.split(":");
    return Math.max(0, +b[0] * 60 + +b[1] - (+a[0] * 60 + +a[1]));
  }
  function renderDay() {
    var p = planForDate(state.plannerDate);
    if (!p) {
      el("plannerCanvas").innerHTML =
        '<div class="panel empty-admin">برای ' +
        esc(state.plannerDate) +
        ' برنامه‌ای نیست.<br><br><button id="emptyCreatePlan" class="btn primary">ساخت برنامه این روز</button></div>';
      el("emptyCreatePlan").onclick = function () {
        openPlanForm(state.plannerDate);
      };
      return;
    }
    var mins = 0,
      tests = 0;
    (p.tasks || []).forEach(function (t) {
      mins += taskMinutes(t);
      tests += Number(t.testCount || 0);
    });
    var h =
      '<div class="day-plan"><aside class="day-summary"><span class="eyebrow">' +
      esc(p.persianDate || p.planDate) +
      "</span><h3>" +
      esc(p.title || "برنامه روزانه") +
      "</h3><p>" +
      (p.published
        ? "منتشر شده و برای دانش‌آموز قابل مشاهده است."
        : "پیش‌نویس؛ دانش‌آموز هنوز نمی‌بیند.") +
      "</p>" +
      (p.motivationText
        ? '<div class="admin-motivation-preview"><small>پیام انگیزشی روز</small><p>' +
          esc(p.motivationText) +
          "</p></div>"
        : "") +
      '<span class="summary-chip">' +
      fa(p.tasks.length) +
      ' فعالیت</span><span class="summary-chip">' +
      fa(mins) +
      ' دقیقه</span><span class="summary-chip">' +
      fa(tests) +
      ' تست</span><div class="plan-action-stack"><button id="addTaskBtn" class="btn primary">' +
      icon("plus") +
      ' افزودن فعالیت</button><button id="togglePublishBtn" class="btn publish">' +
      icon("publish") +
      (p.published ? " بردن به پیش‌نویس" : " انتشار برای دانش‌آموز") +
      '</button><button id="duplicatePlanBtn" class="btn soft">' +
      icon("copy") +
      ' کپی به روز دیگر</button><button id="editPlanBtn" class="btn soft">' +
      icon("edit") +
      ' مشخصات روز</button></div></aside><section class="day-timeline">';
    if (!p.tasks.length)
      h += '<div class="empty-admin">فعالیتی اضافه نشده است.</div>';
    for (var i = 0; i < p.tasks.length; i++) {
      var t = p.tasks[i];
      h +=
        '<div class="admin-task"><div class="admin-task-time">' +
        esc(t.start) +
        " — " +
        esc(t.end) +
        '</div><div class="admin-task-main"><strong><span class="task-type">' +
        esc(t.type) +
        "</span>" +
        esc((t.subject ? t.subject + " — " : "") + (t.title || "")) +
        "</strong><small>" +
        esc(
          (t.pages ? "صفحه " + t.pages + " • " : "") +
            (t.testCount ? t.testCount + " تست • " : "") +
            (t.examId ? "آزمون متصل • " : "") +
            (t.note || ""),
        ) +
        '</small></div><div class="task-buttons"><button class="action-icon" data-edit-task="' +
        esc(t.id) +
        '">' +
        icon("edit") +
        '</button><button class="action-icon danger" data-delete-task="' +
        esc(t.id) +
        '">' +
        icon("trash") +
        "</button></div></div>";
    }
    h += "</section></div>";
    el("plannerCanvas").innerHTML = h;
    el("addTaskBtn").onclick = function () {
      openTaskForm(p, null);
    };
    el("togglePublishBtn").onclick = function () {
      api(
        "PATCH",
        "/admin/plans/" + p.id,
        { published: !p.published },
        function (err) {
          if (err) return toast(err.message);
          toast(!p.published ? "منتشر شد" : "پیش‌نویس شد");
          loadPlanner();
        },
      );
    };
    el("duplicatePlanBtn").onclick = function () {
      var d = prompt("تاریخ مقصد (YYYY-MM-DD)", shift(p.planDate, 1));
      if (d)
        api(
          "POST",
          "/admin/plans/" + p.id + "/duplicate",
          { planDate: d, title: p.title },
          function (err) {
            if (err) return toast(err.message);
            toast("کپی شد");
            state.plannerDate = d;
            loadPlanner();
          },
        );
    };
    el("editPlanBtn").onclick = function () {
      openPlanForm(p.planDate, p);
    };
    var bs = qa("[data-edit-task]");
    for (i = 0; i < bs.length; i++)
      bs[i].onclick = function () {
        openTaskForm(p, findTask(p, this.getAttribute("data-edit-task")));
      };
    bs = qa("[data-delete-task]");
    for (i = 0; i < bs.length; i++)
      bs[i].onclick = function () {
        var id = this.getAttribute("data-delete-task");
        if (confirm("این فعالیت حذف شود؟"))
          api("DELETE", "/admin/tasks/" + id, null, function (err) {
            if (err) return toast(err.message);
            loadPlanner();
          });
      };
  }
  function findTask(p, id) {
    for (var i = 0; i < p.tasks.length; i++)
      if (p.tasks[i].id === id) return p.tasks[i];
    return null;
  }
  function renderWeek() {
    var r = plannerRange(),
      h = '<div class="week-grid">';
    for (var i = 0; i < 7; i++) {
      var date = shift(r.from, i),
        p = planForDate(date);
      h +=
        '<article class="week-day ' +
        (date === today() ? "today" : "") +
        '" data-week-date="' +
        date +
        '"><div class="week-day-head"><div><strong>' +
        esc(p && p.dayLabel ? p.dayLabel : "روز") +
        "</strong><small>" +
        date +
        '</small></div><span class="tag ' +
        (p && p.published ? "" : "warn") +
        '">' +
        (p ? (p.published ? "منتشر" : "پیش‌نویس") : "خالی") +
        "</span></div>";
      if (p) {
        for (var j = 0; j < p.tasks.length; j++) {
          var t = p.tasks[j];
          h +=
            '<div class="week-task"><strong>' +
            esc(t.start) +
            " " +
            esc(t.subject || t.title) +
            "</strong><small>" +
            esc(t.title || "") +
            "</small></div>";
        }
      } else h += '<div class="empty-admin">+</div>';
      h += "</article>";
    }
    h += "</div>";
    el("plannerCanvas").innerHTML = h;
    var cards = qa("[data-week-date]");
    for (i = 0; i < cards.length; i++)
      cards[i].onclick = function () {
        state.plannerDate = this.getAttribute("data-week-date");
        state.plannerMode = "day";
        syncModeButtons();
        loadPlanner();
      };
  }
  function renderMonth() {
    var r = plannerRange(),
      first = new Date(r.from + "T12:00:00"),
      offset = (first.getDay() + 1) % 7,
      days = Number(r.to.slice(-2)),
      heads = ["ش", "ی", "د", "س", "چ", "پ", "ج"],
      h = '<div class="month-grid">';
    for (var x = 0; x < 7; x++)
      h += '<div class="month-head">' + heads[x] + "</div>";
    for (x = 0; x < offset; x++) h += "<div></div>";
    for (var d = 1; d <= days; d++) {
      var date = r.from.slice(0, 8) + ("0" + d).slice(-2),
        p = planForDate(date);
      h +=
        '<article class="month-day ' +
        (date === today() ? "today" : "") +
        '" data-month-date="' +
        date +
        '"><strong>' +
        fa(d) +
        "</strong>" +
        (p
          ? '<div class="month-item ' +
            (p.published ? "published" : "") +
            '">' +
            esc(p.title || "برنامه") +
            '</div><div class="month-item">' +
            fa(p.tasks.length) +
            " فعالیت</div>"
          : "") +
        "</article>";
    }
    h += "</div>";
    el("plannerCanvas").innerHTML = h;
    var cards = qa("[data-month-date]");
    for (x = 0; x < cards.length; x++)
      cards[x].onclick = function () {
        state.plannerDate = this.getAttribute("data-month-date");
        state.plannerMode = "day";
        syncModeButtons();
        loadPlanner();
      };
  }
  function syncModeButtons() {
    var bs = qa("[data-mode]");
    for (var i = 0; i < bs.length; i++)
      bs[i].classList.toggle(
        "active",
        bs[i].getAttribute("data-mode") === state.plannerMode,
      );
  }
  function openPlanForm(date, p) {
    p = p || {};
    openModal(
      '<span class="eyebrow">DAY PLAN</span><h2>' +
        (p.id ? "ویرایش روز" : "ساخت برنامه روز") +
        '</h2><div class="form-grid"><label>تاریخ ISO<input id="pfDate" type="date" value="' +
        esc(date) +
        '"></label><label>عنوان<input id="pfTitle" value="' +
        esc(p.title || "") +
        '" placeholder="مثلاً روز کلاس سنگین"></label><label>عنوان روز<input id="pfDay" value="' +
        esc(p.dayLabel || "") +
        '" placeholder="سه‌شنبه"></label><label>تاریخ فارسی<input id="pfPersian" value="' +
        esc(p.persianDate || "") +
        '"></label><label>شناسه شمسی<input id="pfJalali" value="' +
        esc(p.jalaliId || "") +
        '"></label><label><span>وضعیت</span><select id="pfPublished"><option value="0"' +
        (!p.published ? " selected" : "") +
        '>پیش‌نویس</option><option value="1"' +
        (p.published ? " selected" : "") +
        '>منتشر</option></select></label><label class="span-2">پیام انگیزشی روز<textarea id="pfMotivation" rows="3" maxlength="600" placeholder="مثلاً: امروز لازم نیست کامل باشی؛ فقط قدم بعدی را خوب انجام بده.">' +
        esc(p.motivationText || "") +
        '</textarea><small class="field-hint">در صفحه اصلی و برنامه همان روز به دانش‌آموز نمایش داده می‌شود. در JSON از motivationText استفاده کن.</small></label></div><button id="savePlanForm" class="btn primary full" style="margin-top:12px">ذخیره روز</button>',
    );
    el("savePlanForm").onclick = function () {
      api(
        "POST",
        "/admin/plans",
        {
          studentId: state.studentId,
          planDate: el("pfDate").value,
          title: el("pfTitle").value,
          dayLabel: el("pfDay").value,
          persianDate: el("pfPersian").value,
          jalaliId: el("pfJalali").value,
          motivationText: el("pfMotivation").value,
          published: el("pfPublished").value === "1",
        },
        function (err) {
          if (err) return toast(err.message);
          state.plannerDate = el("pfDate").value;
          closeModal();
          loadPlanner();
        },
      );
    };
  }

  function subjectOptions(value) {
    var h = '<option value="">—</option>';
    for (var i = 0; i < state.subjects.length; i++) {
      var n = state.subjects[i].name || state.subjects[i].subject_key;
      h +=
        "<option" +
        (n === value ? " selected" : "") +
        ">" +
        esc(n) +
        "</option>";
    }
    return h;
  }
  function quizOptions(value) {
    var h = '<option value="">بدون آزمونک</option>';
    for (var i = 0; i < state.quizzes.length; i++)
      h +=
        '<option value="' +
        esc(state.quizzes[i].id) +
        '"' +
        (state.quizzes[i].id === value ? " selected" : "") +
        ">" +
        esc(state.quizzes[i].title) +
        "</option>";
    return h;
  }
  function taskExamOptions(selected) {
    var h = '<option value="">— بدون آزمون مرتبط —</option>';
    for (var i = 0; i < state.exams.length; i++) {
      var e = state.exams[i];
      h +=
        '<option value="' +
        esc(e.id) +
        '"' +
        (selected === e.id ? " selected" : "") +
        ">" +
        esc((e.persianDate || e.isoDate) + " — " + e.title) +
        "</option>";
    }
    return h;
  }
  function syncTaskExamField(selected) {
    var wrap = el("tfExamWrap"),
      sel = el("tfExamId"),
      type = el("tfType");
    if (!wrap || !sel || !type) return;
    if (type.value !== "exam") {
      wrap.classList.add("hidden");
      sel.value = "";
      return;
    }
    wrap.classList.remove("hidden");
    if (state.exams.length) {
      sel.innerHTML = taskExamOptions(selected || sel.value);
      return;
    }
    sel.innerHTML = '<option value="">در حال دریافت آزمون‌ها…</option>';
    api(
      "GET",
      "/admin/exams?studentId=" + encodeURIComponent(state.studentId),
      null,
      function (err, data) {
        if (err) {
          sel.innerHTML = '<option value="">خطا در دریافت آزمون‌ها</option>';
          return;
        }
        state.exams = data || [];
        sel.innerHTML = taskExamOptions(selected || "");
      },
    );
  }
  function openTaskForm(p, t) {
    t = t || {};
    if (!state.subjects.length) {
      api("GET", "/admin/subjects", null, function (err, d) {
        if (!err) {
          state.subjects = d || [];
          openTaskForm(p, t);
        }
      });
      return;
    }
    openModal(
      '<span class="eyebrow">ACTIVITY</span><h2>' +
        (t.id ? "ویرایش فعالیت" : "افزودن فعالیت") +
        '</h2><div class="form-grid"><label>شروع<input id="tfStart" type="time" value="' +
        esc(t.start || "07:00") +
        '"></label><label>پایان<input id="tfEnd" type="time" value="' +
        esc(t.end || "08:00") +
        '"></label><label>نوع<select id="tfType">' +
        ["study", "review", "test", "class", "prayer", "meal", "break", "exam"]
          .map(function (x) {
            return (
              "<option" +
              (t.type === x ? " selected" : "") +
              ">" +
              x +
              "</option>"
            );
          })
          .join("") +
        '</select></label><label>درس<select id="tfSubject">' +
        subjectOptions(t.subject || "") +
        '</select></label><label class="span-2">عنوان<input id="tfTitle" value="' +
        esc(t.title || "") +
        '"></label><label>صفحات<input id="tfPages" value="' +
        esc(t.pages || "") +
        '"></label><label>تعداد تست<input id="tfTests" type="number" min="0" value="' +
        esc(t.testCount || 0) +
        '"></label><label id="tfExamWrap" class="span-2 hidden">آزمون مرتبط<select id="tfExamId"></select><small class="field-hint">اگر نوع فعالیت exam است، آزمونی را انتخاب کن تا دانش‌آموز همان آزمون را مستقیم از برنامه باز کند.</small></label><label class="span-2">یادداشت<textarea id="tfNote" rows="3">' +
        esc(t.note || "") +
        '</textarea></label></div><button id="saveTaskForm" class="btn primary full" style="margin-top:12px">ذخیره فعالیت</button>',
    );
    syncTaskExamField(t.examId || "");
    el("tfType").onchange = function () {
      syncTaskExamField(t.examId || "");
    };
    el("saveTaskForm").onclick = function () {
      var body = {
        start: el("tfStart").value,
        end: el("tfEnd").value,
        type: el("tfType").value,
        subject: el("tfSubject").value,
        title: el("tfTitle").value,
        pages: el("tfPages").value,
        testCount: Number(el("tfTests").value || 0),
        note: el("tfNote").value,
        examId:
          el("tfType").value === "exam" ? el("tfExamId").value || null : null,
        sortOrder: t.sortOrder || p.tasks.length + 1,
      };
      api(
        t.id ? "PATCH" : "POST",
        t.id ? "/admin/tasks/" + t.id : "/admin/plans/" + p.id + "/tasks",
        body,
        function (err) {
          if (err) return toast(err.message);
          closeModal();
          loadPlanner();
        },
      );
    };
  }
  function publishRange() {
    var r = plannerRange();
    if (
      !confirm(
        "تمام برنامه‌های " +
          r.from +
          " تا " +
          r.to +
          " برای دانش‌آموز منتشر شود؟",
      )
    )
      return;
    api(
      "POST",
      "/admin/plans/publish-range",
      { studentId: state.studentId, from: r.from, to: r.to, published: true },
      function (err, d) {
        if (err) return toast(err.message);
        toast(fa(d.updated) + " برنامه منتشر شد");
        loadPlanner();
      },
    );
  }
  function loadExams() {
    if (!state.studentId) return;
    api(
      "GET",
      "/admin/exams?studentId=" + encodeURIComponent(state.studentId),
      null,
      function (err, data) {
        if (err) return toast(err.message, "error");
        state.exams = data || [];
        var h = "";
        for (var i = 0; i < state.exams.length; i++) {
          var e = state.exams[i],
            d = e.delivery || {},
            status = examStateLabel(d.reason, e),
            attempts =
              fa(d.attemptsUsed || 0) +
              " / " +
              fa(d.allowedAttempts || e.maxAttempts || 1);
          h +=
            '<article class="exam-admin-card"><div class="exam-admin-card-head"><div><span class="eyebrow">' +
            esc(e.persianDate || e.isoDate) +
            "</span><h3>" +
            esc(e.title) +
            "</h3><p>" +
            esc(e.note || e.instructions || "") +
            '</p></div><span class="tag ' +
            (e.published ? "blue" : "warn") +
            '">' +
            (e.published ? "منتشر" : "پیش‌نویس") +
            '</span></div><div class="exam-admin-metrics"><span><small>دسترسی</small><strong>' +
            esc(status) +
            "</strong></span><span><small>تلاش</small><strong>" +
            attempts +
            "</strong></span><span><small>سؤال</small><strong>" +
            fa(d.questionCount || 0) +
            "</strong></span><span><small>زمان</small><strong>" +
            fa(e.durationMinutes || 120) +
            ' دقیقه</strong></span></div><div class="exam-window">' +
            icon("clock") +
            "<span>" +
            esc(shortDateTime(e.openAt)) +
            " تا " +
            esc(shortDateTime(e.closeAt)) +
            '</span></div><div class="exam-card-actions"><button class="mini-btn" data-exam-questions="' +
            e.id +
            '">سؤال‌ها</button><button class="mini-btn" data-exam-syllabus="' +
            e.id +
            '">بودجه</button><button class="mini-btn" data-edit-exam="' +
            e.id +
            '">ویرایش</button><button class="mini-btn danger-text" data-del-exam="' +
            e.id +
            '">حذف</button></div></article>';
        }
        el("examAdminList").innerHTML =
          h ||
          '<div class="panel empty-admin">برای دانش‌آموز فعال آزمونی نیست.</div>';
        bindExamActions();
        loadExamRetryRequests();
      },
    );
  }
  function examStateLabel(reason, e) {
    var map = {
      ready: "آماده اجرا",
      resume: "در حال اجرا",
      not_open: "هنوز باز نشده",
      closed: "بازه تمام شده",
      attempt_limit: "تلاش مصرف شده",
      retry_pending: "درخواست در انتظار",
      no_questions: "بدون سؤال",
      not_published: "پیش‌نویس",
      cancelled: "لغو شده",
      completed: "پایان‌یافته",
    };
    return map[reason] || e.status || "آتی";
  }
  function shortDateTime(v) {
    if (!v) return "—";
    return String(v).replace("T", " ").slice(0, 16);
  }
  function inputDateTime(v) {
    return v ? String(v).slice(0, 16) : "";
  }
  function toIranIso(v) {
    if (!v) return "";
    return v.length === 16 ? v + ":00+03:30" : v;
  }
  function loadExamRetryRequests() {
    if (!state.studentId) return;
    api(
      "GET",
      "/admin/exam-attempt-requests?studentId=" +
        encodeURIComponent(state.studentId),
      null,
      function (err, data) {
        if (err) return;
        var list = (data || []).filter(function (x) {
            return x.status === "pending";
          }),
          h = "";
        el("examRetryCount").textContent = fa(list.length);
        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          h +=
            '<div class="retry-request-row"><div><strong>' +
            esc(r.examTitle || "آزمون") +
            "</strong><p>" +
            esc(r.message || "درخواست یک تلاش دیگر") +
            "</p><small>" +
            esc(shortDateTime(r.created_at || r.createdAt)) +
            '</small></div><div class="retry-actions"><button class="mini-btn approve" data-approve-retry="' +
            r.id +
            '">تأیید</button><button class="mini-btn danger-text" data-reject-retry="' +
            r.id +
            '">رد</button></div></div>';
        }
        el("examRetryList").innerHTML =
          h || '<div class="empty-admin">درخواستی در انتظار نیست.</div>';
        var bs = qa("[data-approve-retry]");
        for (i = 0; i < bs.length; i++)
          bs[i].onclick = function () {
            reviewExamRetry(
              this.getAttribute("data-approve-retry"),
              "approved",
            );
          };
        bs = qa("[data-reject-retry]");
        for (i = 0; i < bs.length; i++)
          bs[i].onclick = function () {
            reviewExamRetry(this.getAttribute("data-reject-retry"), "rejected");
          };
      },
    );
  }
  function reviewExamRetry(id, status) {
    var title = status === "approved" ? "تأیید تلاش مجدد" : "رد درخواست";
    openModal(
      '<span class="eyebrow">EXAM RETRY</span><h2>' +
        title +
        "</h2><p>" +
        (status === "approved"
          ? "یک تلاش اضافه برای ۲۴ ساعت فعال می‌شود."
          : "در صورت رد، دلیل کوتاهی برای دانش‌آموز بنویس.") +
        '</p><label>یادداشت مشاور<textarea id="retryAdvisorNote" rows="3"></textarea></label><button id="saveRetryReview" class="btn primary full">ثبت تصمیم</button>',
    );
    el("saveRetryReview").onclick = function () {
      var btn = this;
      setButtonBusy(btn, true, "در حال ثبت…");
      api(
        "PATCH",
        "/admin/exam-attempt-requests/" + encodeURIComponent(id),
        { status: status, advisorNote: el("retryAdvisorNote").value },
        function (err) {
          setButtonBusy(btn, false);
          if (err) return toast(err.message, "error");
          closeModal();
          toast(status === "approved" ? "تلاش مجدد فعال شد" : "درخواست رد شد");
          loadExamRetryRequests();
          loadExams();
          loadDashboard();
        },
      );
    };
  }
  function findExam(id) {
    for (var i = 0; i < state.exams.length; i++)
      if (state.exams[i].id === id) return state.exams[i];
    return null;
  }
  function bindExamActions() {
    var bs = qa("[data-edit-exam]");
    for (var i = 0; i < bs.length; i++)
      bs[i].onclick = function () {
        openExamForm(findExam(this.getAttribute("data-edit-exam")));
      };
    bs = qa("[data-del-exam]");
    for (i = 0; i < bs.length; i++)
      bs[i].onclick = function () {
        var id = this.getAttribute("data-del-exam");
        if (confirm("آزمون و سؤال‌های مرتبط حذف شوند؟"))
          api("DELETE", "/admin/exams/" + id, null, function (err) {
            if (err) return toast(err.message, "error");
            toast("آزمون حذف شد");
            loadExams();
          });
      };
    bs = qa("[data-exam-syllabus]");
    for (i = 0; i < bs.length; i++)
      bs[i].onclick = function () {
        openSyllabus(findExam(this.getAttribute("data-exam-syllabus")));
      };
    bs = qa("[data-exam-questions]");
    for (i = 0; i < bs.length; i++)
      bs[i].onclick = function () {
        openExamQuestions(findExam(this.getAttribute("data-exam-questions")));
      };
  }
  function openExamForm(e) {
    e = e || {};
    var date = e.isoDate || today(),
      open = e.openAt || date + "T08:00:00+03:30",
      close = e.closeAt || date + "T12:00:00+03:30";
    openModal(
      '<span class="eyebrow">EXAM DELIVERY</span><h2>' +
        (e.id ? "ویرایش آزمون" : "آزمون جدید") +
        '</h2><p class="modal-help">آزمون فقط در بازه مشخص فعال می‌شود. به‌صورت پیش‌فرض هر دانش‌آموز یک تلاش دارد.</p><div class="form-grid"><label>عنوان<input id="efTitle" value="' +
        esc(e.title || "") +
        '"></label><label>تاریخ<input id="efIso" type="date" value="' +
        esc(date) +
        '"></label><label>تاریخ فارسی<input id="efPersian" value="' +
        esc(e.persianDate || "") +
        '"></label><label>وضعیت<select id="efStatus"><option value="upcoming">آتی</option><option value="completed">پایان‌یافته</option><option value="cancelled">لغوشده</option></select></label><label>شروع دسترسی<input id="efOpen" type="datetime-local" value="' +
        esc(inputDateTime(open)) +
        '"></label><label>پایان دسترسی<input id="efClose" type="datetime-local" value="' +
        esc(inputDateTime(close)) +
        '"></label><label>مدت آزمون (دقیقه)<input id="efDuration" type="number" min="1" max="600" value="' +
        esc(e.durationMinutes || 120) +
        '"></label><label>تلاش پایه<input id="efAttempts" type="number" min="1" max="1" readonly value="1"></label><label>انتشار<select id="efPublished"><option value="1">منتشر و قابل مشاهده</option><option value="0">پیش‌نویس</option></select></label><label class="span-2">راهنمای شروع<textarea id="efInstructions" rows="3">' +
        esc(
          e.instructions ||
            "بعد از شروع، زمان آزمون متوقف نمی‌شود. پاسخ‌ها را قبل از پایان ثبت کن.",
        ) +
        '</textarea></label><label class="span-2">یادداشت<textarea id="efNote" rows="2">' +
        esc(e.note || "") +
        '</textarea></label></div><button id="saveExam" class="btn primary full">ذخیره آزمون</button>',
    );
    el("efStatus").value = e.status || "upcoming";
    el("efPublished").value = e.published === false ? "0" : "1";
    el("saveExam").onclick = function () {
      var btn = this,
        body = {
          studentId: state.studentId,
          title: el("efTitle").value,
          isoDate: el("efIso").value,
          persianDate: el("efPersian").value,
          status: el("efStatus").value,
          openAt: toIranIso(el("efOpen").value),
          closeAt: toIranIso(el("efClose").value),
          durationMinutes: Number(el("efDuration").value || 120),
          maxAttempts: 1,
          published: el("efPublished").value === "1",
          instructions: el("efInstructions").value,
          note: el("efNote").value,
        };
      if (!body.title) return toast("عنوان آزمون لازم است.", "error");
      if (!body.openAt || !body.closeAt)
        return toast("زمان شروع و پایان لازم است.", "error");
      if (new Date(body.closeAt) <= new Date(body.openAt))
        return toast("پایان آزمون باید بعد از شروع باشد.", "error");
      setButtonBusy(btn, true, "در حال ذخیره…");
      api(
        e.id ? "PATCH" : "POST",
        e.id ? "/admin/exams/" + e.id : "/admin/exams",
        body,
        function (err, saved) {
          setButtonBusy(btn, false);
          if (err) return toast(err.message, "error");
          closeModal();
          toast("آزمون ذخیره شد");
          loadExams();
          if (!e.id && saved)
            setTimeout(function () {
              openExamQuestions(saved);
            }, 100);
        },
      );
    };
  }
  function openExamQuestions(e) {
    if (!e) return;
    api(
      "GET",
      "/admin/exams/" + encodeURIComponent(e.id) + "/questions",
      null,
      function (err, rows) {
        if (err) return toast(err.message, "error");
        var h =
          '<span class="eyebrow">QUESTIONS</span><h2>سؤال‌های ' +
          esc(e.title) +
          '</h2><p class="modal-help">چهار گزینه و پاسخ صحیح را ثبت کن. سؤال‌ها با همان آزمون به دانش‌آموز تحویل می‌شوند.</p><div class="question-admin-list">';
        for (var i = 0; i < (rows || []).length; i++) {
          var x = rows[i];
          h +=
            '<div class="question-admin-row"><div><strong>' +
            fa(i + 1) +
            ". " +
            esc(x.question_text || x.question || "") +
            "</strong><small>پاسخ صحیح: " +
            esc(String(x.correct_option || "").toUpperCase()) +
            '</small></div><button class="action-icon danger" data-del-exam-question="' +
            x.id +
            '">' +
            icon("trash") +
            "</button></div>";
        }
        h +=
          (rows && rows.length
            ? ""
            : '<div class="empty-admin">هنوز سؤالی ثبت نشده.</div>') +
          '</div><hr><div class="question-builder"><label>صورت سؤال<textarea id="eqQuestion" rows="3"></textarea></label><div class="form-grid"><label>گزینه A<input id="eqA"></label><label>گزینه B<input id="eqB"></label><label>گزینه C<input id="eqC"></label><label>گزینه D<input id="eqD"></label><label>پاسخ صحیح<select id="eqCorrect"><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></label></div><label>توضیح پاسخ<textarea id="eqExplanation" rows="2"></textarea></label><button id="addExamQuestion" class="btn primary full">افزودن سؤال</button></div>';
        openModal(h);
        el("addExamQuestion").onclick = function () {
          var btn = this,
            body = {
              question: el("eqQuestion").value,
              options: [
                el("eqA").value,
                el("eqB").value,
                el("eqC").value,
                el("eqD").value,
              ],
              correctOption: el("eqCorrect").value,
              explanation: el("eqExplanation").value,
              sortOrder: (rows || []).length + 1,
            };
          setButtonBusy(btn, true, "در حال افزودن…");
          api(
            "POST",
            "/admin/exams/" + e.id + "/questions",
            body,
            function (er) {
              setButtonBusy(btn, false);
              if (er) return toast(er.message, "error");
              toast("سؤال اضافه شد");
              openExamQuestions(e);
              loadExams();
            },
          );
        };
        var ds = qa("[data-del-exam-question]");
        for (i = 0; i < ds.length; i++)
          ds[i].onclick = function () {
            var id = this.getAttribute("data-del-exam-question");
            if (confirm("این سؤال حذف شود؟"))
              api(
                "DELETE",
                "/admin/exams/" + e.id + "/questions/" + id,
                null,
                function (er) {
                  if (er) return toast(er.message, "error");
                  openExamQuestions(e);
                  loadExams();
                },
              );
          };
      },
    );
  }
  function openSyllabus(e) {
    var h =
      '<span class="eyebrow">SYLLABUS</span><h2>' +
      esc(e.title) +
      '</h2><div id="syllabusRows">';
    for (var i = 0; i < (e.syllabus || []).length; i++) {
      var x = e.syllabus[i];
      h +=
        '<div class="inbox-item"><div><strong>' +
        esc(x.subject) +
        "</strong><p>" +
        esc(x.description) +
        '</p></div><button class="action-icon danger" data-del-syl="' +
        x.id +
        '">' +
        icon("trash") +
        "</button></div>";
    }
    h +=
      '</div><hr><div class="form-grid"><label>درس<input id="sfSubject"></label><label>مسیر<input id="sfTrack"></label><label class="span-2">توضیح بودجه<textarea id="sfDesc" rows="2"></textarea></label></div><button id="addSyllabus" class="btn primary full">افزودن بودجه</button>';
    openModal(h);
    el("addSyllabus").onclick = function () {
      api(
        "POST",
        "/admin/exams/" + e.id + "/syllabus",
        {
          subject: el("sfSubject").value,
          description: el("sfDesc").value,
          track: el("sfTrack").value,
          required: true,
        },
        function (err) {
          if (err) return toast(err.message);
          closeModal();
          loadExams();
        },
      );
    };
    var ds = qa("[data-del-syl]");
    for (i = 0; i < ds.length; i++)
      ds[i].onclick = function () {
        api(
          "DELETE",
          "/admin/syllabus/" + this.getAttribute("data-del-syl"),
          null,
          function (err) {
            if (err) return toast(err.message);
            closeModal();
            loadExams();
          },
        );
      };
  }
  function loadQuizzes() {
    api("GET", "/admin/quizzes", null, function (err, data) {
      if (err) return toast(err.message);
      state.quizzes = data || [];
      var h = "";
      for (var i = 0; i < state.quizzes.length; i++) {
        var z = state.quizzes[i];
        h +=
          '<div class="table-row"><div><strong>' +
          esc(z.title) +
          "</strong><small>" +
          esc(z.subject || "") +
          "</small></div><div>" +
          fa(z.duration_minutes || 20) +
          " دقیقه</div><div>" +
          fa(z.question_count || 0) +
          ' سؤال</div><div class="actions"><button class="action-icon" data-questions="' +
          z.id +
          '">' +
          icon("test") +
          "</button></div></div>";
      }
      el("quizAdminList").innerHTML =
        h || '<div class="empty-admin">آزمونکی نیست.</div>';
      var bs = qa("[data-questions]");
      for (i = 0; i < bs.length; i++)
        bs[i].onclick = function () {
          openQuestions(this.getAttribute("data-questions"));
        };
    });
  }
  function openQuizForm() {
    openModal(
      '<h2>آزمونک جدید</h2><div class="form-grid"><label>عنوان<input id="qfTitle"></label><label>درس<input id="qfSubject"></label><label>زمان (دقیقه)<input id="qfDuration" type="number" value="20"></label></div><button id="saveQuiz" class="btn primary full">ساخت آزمونک</button>',
    );
    el("saveQuiz").onclick = function () {
      api(
        "POST",
        "/admin/quizzes",
        {
          title: el("qfTitle").value,
          subject: el("qfSubject").value,
          durationMinutes: Number(el("qfDuration").value || 20),
        },
        function (err) {
          if (err) return toast(err.message);
          closeModal();
          loadQuizzes();
        },
      );
    };
  }
  function openQuestions(id) {
    api(
      "GET",
      "/admin/quizzes/" + id + "/questions",
      null,
      function (err, data) {
        if (err) return toast(err.message);
        var h = "<h2>سؤال‌ها</h2>";
        for (var i = 0; i < data.length; i++)
          h +=
            '<div class="inbox-item"><div><strong>' +
            esc(data[i].question_text) +
            "</strong><p>پاسخ: " +
            esc(data[i].correct_option) +
            '</p></div><button class="action-icon danger" data-del-question="' +
            data[i].id +
            '">' +
            icon("trash") +
            "</button></div>";
        h +=
          '<hr><label>صورت سؤال<textarea id="newQuestion" rows="3"></textarea></label><div class="form-grid"><label>گزینه ۱<input id="optA"></label><label>گزینه ۲<input id="optB"></label><label>گزینه ۳<input id="optC"></label><label>گزینه ۴<input id="optD"></label><label>پاسخ<select id="correctOpt"><option value="a">۱</option><option value="b">۲</option><option value="c">۳</option><option value="d">۴</option></select></label></div><button id="addQuestion" class="btn primary full">افزودن سؤال</button>';
        openModal(h);
        el("addQuestion").onclick = function () {
          api(
            "POST",
            "/admin/quizzes/" + id + "/questions",
            {
              question: el("newQuestion").value,
              options: [
                el("optA").value,
                el("optB").value,
                el("optC").value,
                el("optD").value,
              ],
              correctOption: el("correctOpt").value,
              explanation: "",
              sortOrder: data.length + 1,
            },
            function (er) {
              if (er) return toast(er.message);
              closeModal();
              openQuestions(id);
            },
          );
        };
        var ds = qa("[data-del-question]");
        for (i = 0; i < ds.length; i++)
          ds[i].onclick = function () {
            var qid = this.getAttribute("data-del-question");
            api("DELETE", "/admin/questions/" + qid, null, function (er) {
              if (er) return toast(er.message);
              closeModal();
              openQuestions(id);
            });
          };
      },
    );
  }
  function updateChatBadge() {
    var n = 0;
    for (var i = 0; i < state.conversations.length; i++)
      n += Number(state.conversations[i].unread || 0);
    var b = el("chatUnreadBadge");
    if (!b) return;
    b.textContent = fa(n);
    b.className = n ? "nav-badge" : "nav-badge hidden";
  }
  function loadChatList(done) {
    api("GET", "/admin/chat/conversations", null, function (err, data) {
      if (err) return toast(err.message);
      state.conversations = data || [];
      renderConversationList();
      updateChatBadge();
      if (!state.chatConversationId && state.studentId)
        selectConversationForStudent(state.studentId);
      else if (state.chatConversationId)
        loadChatMessages(state.chatConversationId);
      done && done();
    });
  }
  function renderConversationList() {
    var h = "",
      term = el("conversationSearch")
        ? String(el("conversationSearch").value || "").toLowerCase()
        : "";
    for (var i = 0; i < state.conversations.length; i++) {
      var c = state.conversations[i],
        p = c.presence || {},
        last = c.lastMessage,
        active = c.id === state.chatConversationId,
        hay = (c.student.name + " " + (last ? last.text : "")).toLowerCase();
      if (term && hay.indexOf(term) < 0) continue;
      h +=
        '<button class="conversation-item ' +
        (active ? "active" : "") +
        '" data-conversation="' +
        esc(c.id) +
        '"><span class="conversation-avatar">' +
        esc((c.student.name || "?").charAt(0)) +
        '</span><span class="conversation-copy"><strong>' +
        esc(c.student.name) +
        "</strong><small>" +
        (last ? esc(last.text) : "هنوز پیامی نیست") +
        '</small></span><span class="conversation-meta"><i class="presence-mini ' +
        (p.online ? "online" : "") +
        '"></i>' +
        (c.unread ? "<b>" + fa(c.unread) + "</b>" : "") +
        "</span></button>";
    }
    el("conversationList").innerHTML =
      h || '<div class="empty-admin">گفتگویی پیدا نشد.</div>';
    var bs = qa("[data-conversation]");
    for (i = 0; i < bs.length; i++)
      bs[i].onclick = function () {
        selectConversation(this.getAttribute("data-conversation"));
      };
  }
  function selectConversationForStudent(studentId) {
    for (var i = 0; i < state.conversations.length; i++)
      if (state.conversations[i].student.id === studentId)
        return selectConversation(state.conversations[i].id);
  }
  function selectConversation(id) {
    state.chatConversationId = id;
    renderConversationList();
    loadChatMessages(id);
  }
  function currentConversation() {
    for (var i = 0; i < state.conversations.length; i++)
      if (state.conversations[i].id === state.chatConversationId)
        return state.conversations[i];
    return null;
  }
  function loadChatMessages(id) {
    if (!id) return;
    api(
      "GET",
      "/chat/conversations/" + encodeURIComponent(id) + "/messages?limit=120",
      null,
      function (err, data) {
        if (err) return toast(err.message, "error");
        state.chatMessages = data.messages || [];
        var c = currentConversation();
        el("chatEmpty").className = "chat-empty hidden";
        el("chatActive").className = "";
        if (c) {
          el("chatStudentName").textContent = c.student.name;
          el("chatStudentAvatar").textContent = (c.student.name || "?").charAt(
            0,
          );
          var p = c.presence || {};
          el("chatStudentPresence").textContent = p.online
            ? "● آنلاین"
            : "آخرین فعالیت: " + (p.lastSeenAt || "نامشخص");
        }
        renderAdminChatMessages();
        if (data.unread) markChatRead();
      },
    );
  }
  function chatClock(v) {
    try {
      var d = new Date(v);
      return (
        ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)
      );
    } catch (e) {
      return "";
    }
  }
  function chatDayLabel(day) {
    if (!day) return "";
    var t = today();
    if (day === t) return "امروز";
    if (day === shift(t, -1)) return "دیروز";
    return day;
  }
  function renderAdminChatMessages() {
    var h = "",
      lastDay = "";
    for (var i = 0; i < state.chatMessages.length; i++) {
      var m = state.chatMessages[i],
        mine = m.senderRole === "admin",
        day = String(m.createdAt || "").slice(0, 10);
      if (day !== lastDay) {
        lastDay = day;
        h +=
          '<div class="chat-day-separator"><span>' +
          esc(chatDayLabel(day)) +
          "</span></div>";
      }
      h +=
        '<div class="admin-chat-message ' +
        (mine ? "mine" : "theirs") +
        '"><div>' +
        esc(m.deletedAt ? "پیام حذف شده" : m.text) +
        "</div><small>" +
        esc(chatClock(m.createdAt)) +
        (mine ? (m.seen ? " • ✓✓ دیده شد" : " • ✓ ارسال شد") : "") +
        "</small></div>";
    }
    el("adminChatMessages").innerHTML =
      h || '<div class="chat-day-empty">هنوز پیامی ردوبدل نشده.</div>';
    el("adminChatMessages").scrollTop = el("adminChatMessages").scrollHeight;
  }
  function sendAdminChat() {
    var id = state.chatConversationId,
      input = el("adminChatInput"),
      text = input.value.replace(/^\s+|\s+$/g, "");
    if (!id || !text || state.chatSending) return;
    state.chatSending = true;
    var btn = el("adminChatSend");
    setButtonBusy(btn, true, "در حال ارسال…");
    api(
      "POST",
      "/chat/conversations/" + encodeURIComponent(id) + "/messages",
      { text: text },
      function (err, msg) {
        state.chatSending = false;
        setButtonBusy(btn, false);
        if (err) return toast(err.message, "error");
        input.value = "";
        autoGrow(input);
        state.chatMessages.push(msg);
        renderAdminChatMessages();
        loadChatList();
      },
    );
  }
  function markChatRead() {
    if (!state.chatConversationId) return;
    api(
      "POST",
      "/chat/conversations/" +
        encodeURIComponent(state.chatConversationId) +
        "/read",
      {},
      function (err) {
        if (!err) loadChatList();
      },
    );
  }
  function startChatPolling() {
    stopChatPolling();
    state.chatPoll = setInterval(function () {
      if (state.chatConversationId) loadChatMessages(state.chatConversationId);
      else loadChatList();
    }, 20000);
  }
  function stopChatPolling() {
    if (state.chatPoll) clearInterval(state.chatPoll);
    state.chatPoll = null;
  }
  function connectEvents() {
    disconnectEvents();
    state.eventSource = API.openEvents(
      function (type, data) {
        if (type === "chat.message.created") {
          loadChatList();
          if (state.chatConversationId === data.conversationId) {
            loadChatMessages(state.chatConversationId);
            if (data.senderRole === "student") markChatRead();
          } else if (data.senderRole === "student")
            toast("پیام جدید دانش‌آموز");
        } else if (type === "chat.messages.read") {
          if (state.chatConversationId === data.conversationId)
            loadChatMessages(state.chatConversationId);
        } else if (type === "presence.changed") {
          loadChatList();
          if (
            q(".view.active") &&
            q(".view.active").id === "view-live" &&
            data.studentId === state.studentId
          )
            loadLive();
        } else if (type === "exam.retry_requested") {
          if (data.studentId === state.studentId) {
            toast("درخواست تلاش مجدد آزمون دریافت شد");
            loadExamRetryRequests();
            loadDashboard();
          }
        } else {
          if (data.studentId === state.studentId) {
            if (q(".view.active") && q(".view.active").id === "view-live")
              loadLive();
            if (q(".view.active") && q(".view.active").id === "view-dashboard")
              loadDashboard();
            if (
              type === "exam.updated" &&
              q(".view.active") &&
              q(".view.active").id === "view-exams"
            )
              loadExams();
          }
        }
      },
      function (status) {
        var x = el("chatConnectionState");
        if (x) {
          x.textContent = status === "open" ? "● متصل" : "○ در حال اتصال";
          x.className =
            "chat-connection " + (status === "open" ? "online" : "");
        }
      },
    );
  }
  function disconnectEvents() {
    if (state.eventSource) {
      try {
        state.eventSource.close();
      } catch (e) {}
      state.eventSource = null;
    }
  }

  function parseJsonText() {
    try {
      var d = JSON.parse(el("jsonText").value || "{}");
      d.studentId = state.studentId;
      state.importData = d;
      return d;
    } catch (e) {
      toast("JSON نامعتبر است: " + e.message);
      return null;
    }
  }
  function previewImport() {
    var d = parseJsonText();
    if (!d) return;
    api(
      "POST",
      "/admin/import/preview",
      { studentId: state.studentId, data: d },
      function (err, p) {
        if (err) return toast(err.message);
        state.importPreview = p;
        renderImportPreview();
      },
    );
  }
  function renderImportPreview() {
    var p = state.importPreview;
    if (!p) return;
    var st = selectedStudent(),
      h =
        '<div class="import-target"><strong>مقصد:</strong> ' +
        esc(st ? st.name : "—") +
        '</div><div class="import-summary"><span>' +
        fa(p.summary.plans) +
        " روز</span><span>" +
        fa(p.summary.tasks) +
        " فعالیت</span><span>" +
        fa(p.summary.exams) +
        " آزمون</span><span>" +
        fa(p.summary.questions || 0) +
        " سؤال</span><span>" +
        fa(p.summary.conflicts) +
        " تداخل</span></div>";
    if (p.errors.length)
      h +=
        '<div class="import-errors"><strong>خطاها:</strong><br>' +
        p.errors.map(esc).join("<br>") +
        "</div>";
    if (p.warnings.length)
      h +=
        '<div class="import-warnings"><strong>هشدارها:</strong><br>' +
        p.warnings.map(esc).join("<br>") +
        "</div>";
    for (var i = 0; i < p.plans.length; i++) {
      var x = p.plans[i];
      h +=
        '<div class="import-plan"><strong>' +
        esc(x.planDate) +
        " — " +
        esc(x.title || "برنامه") +
        "</strong><small>" +
        fa(x.tasks.length) +
        " فعالیت • " +
        (x.published ? "منتشر" : "پیش‌نویس") +
        (x.motivationText ? " • پیام انگیزشی دارد" : "") +
        "</small></div>";
    }
    for (i = 0; i < p.exams.length; i++) {
      x = p.exams[i];
      h +=
        '<div class="import-plan"><strong>آزمون: ' +
        esc(x.title) +
        "</strong><small>" +
        esc(x.isoDate) +
        " • " +
        fa(x.syllabus.length) +
        " مبحث • " +
        fa((x.questions || []).length) +
        " سؤال</small></div>";
    }
    if (!p.errors.length)
      h +=
        '<div class="commit-options"><label><input id="replacePlans" type="checkbox"> جایگزینی برنامه‌های موجود در همان تاریخ</label><label><input id="replaceExams" type="checkbox"> جایگزینی آزمون همنام/هم‌تاریخ</label></div><div class="import-actions"><button id="commitDraft" class="btn soft">ثبت پیش‌نویس</button><button id="commitPublish" class="btn publish">ثبت + انتشار برای دانش‌آموز</button></div>';
    el("importPreview").innerHTML = h;
    el("importPreview").className = "import-preview";
    if (el("commitDraft"))
      el("commitDraft").onclick = function () {
        commitImport(false);
      };
    if (el("commitPublish"))
      el("commitPublish").onclick = function () {
        commitImport(true);
      };
  }
  function commitImport(publish) {
    var d = state.importData;
    if (!d) return;
    d.studentId = state.studentId;
    var b1 = el("commitDraft"),
      b2 = el("commitPublish");
    setButtonBusy(b1, true, "در حال ثبت…");
    setButtonBusy(b2, true, "در حال ثبت…");
    api(
      "POST",
      "/admin/import/commit",
      {
        studentId: state.studentId,
        data: d,
        replaceExistingPlans: el("replacePlans") && el("replacePlans").checked,
        replaceExistingExams: el("replaceExams") && el("replaceExams").checked,
        publishImported: publish,
        sourceName: "Admin JSON " + new Date().toISOString(),
      },
      function (err, res) {
        setButtonBusy(b1, false);
        setButtonBusy(b2, false);
        if (err) return toast(err.message, "error");
        toast(
          fa(res.plans) +
            " برنامه، " +
            fa(res.exams) +
            " آزمون و " +
            fa(res.questions || 0) +
            " سؤال وارد شد",
        );
        closeModal();
        state.plannerDate =
          d.plans && d.plans.length ? d.plans[0].planDate : today();
        if (d.plans && d.plans.length) {
          state.plannerMode = "week";
          syncModeButtons();
          switchView("planner");
        } else switchView("exams");
      },
    );
  }
  function downloadTemplate() {
    api(
      "GET",
      "/admin/import/template?studentId=" + encodeURIComponent(state.studentId),
      null,
      function (err, d) {
        if (err) return toast(err.message, "error");
        var blob = new Blob([JSON.stringify(d, null, 2)], {
            type: "application/json",
          }),
          a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download =
          "moshaver-" +
          (selectedStudent() ? selectedStudent().name : "student") +
          "-template.json";
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
        }, 500);
      },
    );
  }
  function readJsonFile(file) {
    var r = new FileReader();
    r.onload = function () {
      el("jsonText").value = String(r.result || "");
    };
    r.readAsText(file);
  }
  function bind() {
    el("loginForm").onsubmit = function (e) {
      e.preventDefault();
      if (state.authStatus === "logging-in") return;
      cancelStartupAuth();
      if (state.loginRequest) {
        try {
          state.loginRequest.abort();
        } catch (ex) {}
        state.loginRequest = null;
      }
      el("loginError").className = "error hidden";
      var btn = q('#loginForm button[type="submit"]'),
        btnLabel = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "در حال ورود…";
      }
      state.authStatus = "logging-in";
      var loginEpoch = ++state.authEpoch;
      state.loginRequest = API.request(
        "POST",
        "/auth/login",
        { username: el("username").value, password: el("password").value },
        function (err, d) {
          state.loginRequest = null;
          if (btn) {
            btn.disabled = false;
            btn.textContent = btnLabel || "ورود";
          }
          if (loginEpoch !== state.authEpoch) return;
          if (err) {
            state.authStatus = "anonymous";
            el("loginError").textContent = err.message;
            el("loginError").className = "error";
            return;
          }
          if (!d || !d.user || d.user.role !== "admin") {
            if (d && d.csrfToken) API.setCsrf(d.csrfToken);
            clearWrongAdminRoleSession("این حساب مدیر نیست.");
            return;
          }
          setPendingAdminLogout(false);
          API.setCsrf(d.csrfToken || "");
          state.me = d.user;
          state.authStatus = "authenticated";
          el("password").value = "";
          broadcastAdminAuth("login");
          bootAfterMe();
        },
        { suppressAuthFailure: true },
      );
    };
    var ns = qa(".nav[data-view]");
    for (var i = 0; i < ns.length; i++)
      ns[i].onclick = function () {
        switchView(this.getAttribute("data-view"));
        var sb = q(".sidebar");
        if (sb) sb.classList.remove("open");
        var mm = el("mobileMenu");
        if (mm) mm.setAttribute("aria-expanded", "false");
      };
    el("studentSelect").onchange = function () {
      state.studentId = this.value;
      state.exams = [];
      var active = q(".view.active");
      switchView(active ? active.id.replace("view-", "") : "dashboard");
    };
    el("logoutBtn").onclick = function () {
      if (
        state.authStatus === "logging-out" ||
        state.authStatus === "anonymous"
      )
        return;
      state.authStatus = "logging-out";
      state.authEpoch++;
      if (state.loginRequest) {
        try {
          state.loginRequest.abort();
        } catch (e) {}
        state.loginRequest = null;
      }
      if (state.startupAuthRequest) {
        try {
          state.startupAuthRequest.abort();
        } catch (e) {}
        state.startupAuthRequest = null;
      }
      API.abortAll();
      stopLivePolling();
      stopChatPolling();
      disconnectEvents();
      setPendingAdminLogout(true);
      API.request(
        "POST",
        "/auth/logout",
        {},
        function (err) {
          if (err && err.status === 0) {
            finishAdminLogout(
              "از پنل خارج شدی. خروج سرور به محض برگشت اینترنت تکمیل می‌شود.",
              true,
              false,
            );
            return;
          }
          finishAdminLogout("با موفقیت خارج شدید.", false, false);
        },
        { suppressAuthFailure: true, noCsrfRetry: true },
      );
    };
    el("refreshDashboard").onclick = loadDashboard;
    el("adminNotificationBtn").onclick = openAdminNotifications;
    el("refreshLive").onclick = loadLive;
    el("refreshChat").onclick = loadChatList;
    el("chatMarkRead").onclick = markChatRead;
    el("adminChatForm").onsubmit = function (e) {
      e.preventDefault();
      sendAdminChat();
    };
    if (el("conversationSearch"))
      el("conversationSearch").oninput = renderConversationList;
    var cq = qa("[data-chat-quick]");
    for (i = 0; i < cq.length; i++)
      cq[i].onclick = function () {
        el("adminChatInput").value = this.getAttribute("data-chat-quick");
        autoGrow(el("adminChatInput"));
        el("adminChatInput").focus();
      };
    el("adminChatInput").oninput = function () {
      autoGrow(this);
    };
    el("adminChatInput").onkeydown = function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendAdminChat();
      }
    };
    el("quickImport").onclick = openImport;
    el("importJsonBtn").onclick = openImport;
    el("createPlanBtn").onclick = function () {
      openPlanForm(state.plannerDate || today());
    };
    el("quickTomorrow").onclick = function () {
      state.plannerDate = shift(today(), 1);
      state.plannerMode = "day";
      syncModeButtons();
      switchView("planner");
      setTimeout(function () {
        if (!planForDate(state.plannerDate)) openPlanForm(state.plannerDate);
      }, 400);
    };
    var modes = qa("[data-mode]");
    for (i = 0; i < modes.length; i++)
      modes[i].onclick = function () {
        state.plannerMode = this.getAttribute("data-mode");
        syncModeButtons();
        loadPlanner();
      };
    el("plannerDate").onchange = function () {
      state.plannerDate = this.value;
      loadPlanner();
    };
    el("prevPeriod").onclick = function () {
      state.plannerDate = shift(
        state.plannerDate,
        state.plannerMode === "day"
          ? -1
          : state.plannerMode === "week"
            ? -7
            : -30,
      );
      loadPlanner();
    };
    el("nextPeriod").onclick = function () {
      state.plannerDate = shift(
        state.plannerDate,
        state.plannerMode === "day" ? 1 : state.plannerMode === "week" ? 7 : 30,
      );
      loadPlanner();
    };
    el("todayPeriod").onclick = function () {
      state.plannerDate = today();
      loadPlanner();
    };
    el("publishRangeBtn").onclick = publishRange;
    el("newExamBtn").onclick = function () {
      openExamForm(null);
    };
    el("examJsonBtn").onclick = openImport;
    el("newQuizBtn").onclick = openQuizForm;
    el("messageStudentBtn").onclick = sendMessage;
    el("newSubjectBtn").onclick = newSubject;
    el("changePasswordBtn").onclick = openChangePassword;
    el("previewImport").onclick = previewImport;
    el("downloadTemplate").onclick = downloadTemplate;
    el("jsonFile").onchange = function () {
      if (this.files && this.files[0]) readJsonFile(this.files[0]);
    };
    var dz = el("dropZone");
    dz.onclick = function (e) {
      if (e.target !== el("jsonFile")) el("jsonFile").click();
    };
    dz.onkeydown = function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el("jsonFile").click();
      }
    };
    dz.ondragover = function (e) {
      e.preventDefault();
      this.classList.add("drag");
    };
    dz.ondragleave = function () {
      this.classList.remove("drag");
    };
    dz.ondrop = function (e) {
      e.preventDefault();
      this.classList.remove("drag");
      if (e.dataTransfer.files && e.dataTransfer.files[0])
        readJsonFile(e.dataTransfer.files[0]);
    };
    el("mobileMenu").onclick = function () {
      var sb = q(".sidebar"),
        open = !sb.classList.contains("open");
      sb.classList.toggle("open", open);
      this.setAttribute("aria-expanded", open ? "true" : "false");
    };
  }
  function bootAfterMe() {
    if (state.authStatus !== "authenticated" || !state.me) return;
    stopLivePolling();
    stopChatPolling();
    disconnectEvents();
    showApp();
    state.plannerDate = today();
    loadStudents(function () {
      loadDashboard();
      loadChatList();
      connectEvents();
    });
  }
  function cancelStartupAuth() {
    state.authEpoch++;
    if (state.startupAuthRequest) {
      try {
        state.startupAuthRequest.abort();
      } catch (e) {}
      state.startupAuthRequest = null;
    }
  }
  function boot() {
    if (state.authRetryTimer) {
      clearTimeout(state.authRetryTimer);
      state.authRetryTimer = null;
    }
    var epoch = ++state.authEpoch;
    state.authStatus = "checking";
    var btn = q('#loginForm button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "در حال بازیابی نشست…";
    }
    var le = el("loginError");
    if (le) {
      le.textContent = "در حال بررسی نشست امن…";
      le.className = "error auth-checking";
    }
    state.startupAuthRequest = API.request(
      "GET",
      "/auth/me",
      null,
      function (err, d) {
        state.startupAuthRequest = null;
        if (epoch !== state.authEpoch) return;
        if (err) {
          if (err.status === 401) {
            API.clearAuth();
            state.authStatus = "anonymous";
            if (btn) {
              btn.disabled = false;
              btn.textContent = "ورود";
            }
            showLogin();
            return;
          }
          state.authStatus = "checking";
          if (le) {
            le.textContent =
              "ارتباط با سرور موقتاً برقرار نیست؛ نشست حذف نشده و دوباره تلاش می‌کنیم…";
            le.className = "error auth-checking";
          }
          state.authRetryTimer = setTimeout(function () {
            if (state.authStatus === "checking") boot();
          }, 1800);
          return;
        }
        if (!d || d.role !== "admin") {
          clearWrongAdminRoleSession("این حساب مدیر نیست.");
          return;
        }
        state.me = d;
        state.authStatus = "authenticated";
        if (btn) {
          btn.disabled = false;
          btn.textContent = "ورود";
        }
        bootAfterMe();
      },
      { suppressAuthFailure: true },
    );
  }
  function syncAdminVisible() {
    if (state.authStatus !== "authenticated" || !state.me || document.hidden)
      return;
    if (Date.now() - state.lastSyncAt < 15000) return;
    API.refreshCsrf(function (err) {
      if (err) return;
      var active = q(".view.active"),
        name = active ? active.id.replace("view-", "") : "dashboard";
      if (name === "dashboard") loadDashboard();
      else if (name === "live") loadLive();
      else if (name === "chat") loadChatList();
    });
  }
  function syncAdminAuthSignal(ev) {
    if (!ev || ev.key !== AUTH_SIGNAL_KEY || !ev.newValue) return;
    var data = null;
    try {
      data = JSON.parse(ev.newValue);
    } catch (e) {}
    if (!data) return;
    if (data.kind === "logout") {
      if (state.authStatus !== "anonymous")
        finishAdminLogout("نشست در تب دیگری خارج شد.", false, true);
      return;
    }
    if (
      data.kind === "login" &&
      state.authStatus !== "logging-in" &&
      state.authStatus !== "logging-out"
    )
      boot();
  }
  function init() {
    Modal.bind();
    Connectivity.syncFromBrowser();
    bind();
    API.setAuthFailureHandler(handleAuthFailure);
    el("versionText").textContent =
      (global.APP_CONFIG && global.APP_CONFIG.APP_VERSION) || "1.4.2";
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) syncAdminVisible();
    });
    window.addEventListener("pageshow", syncAdminVisible);
    window.addEventListener("storage", syncAdminAuthSignal);
    window.addEventListener("offline", function () {
      Connectivity.set("offline");
    });
    window.addEventListener("online", function () {
      Connectivity.set("syncing");
      if (hasPendingAdminLogout())
        flushPendingAdminLogout(function (err) {
          if (!err && state.authStatus === "anonymous")
            showLogin("خروج سرور هم تکمیل شد.");
        });
      else syncAdminVisible();
    });
    if (hasPendingAdminLogout()) {
      state.authStatus = "logging-out";
      flushPendingAdminLogout(function (err) {
        state.authStatus = "anonymous";
        if (err) showLogin("خروج قبلی هنوز منتظر اتصال اینترنت است.");
        else showLogin();
      });
      return;
    }
    boot();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
