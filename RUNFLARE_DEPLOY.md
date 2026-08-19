# Runflare deployment — Moshaver v1.4.2

Recommended current deployment:

```text
https://st.mahakaram.ir      Student PWA (Docker/Nginx :80)
https://api.mahakaram.ir     Backend (Node 22 or Docker :4000)
http://localhost:8081        Admin on your laptop
```

## 1. Backend

Deploy from the backend root, not from the fullstack root:

```bash
cd backend
runflare reset   # only if this service previously cached the wrong deploy root
runflare deploy
```

Backend runtime requirements:

```text
Node: 22.5+ (22.12 is supported with --experimental-sqlite)
Internal/target port: 4000
Health path: /health
Persistent disk mount: /data
```

Production environment:

```env
NODE_ENV=production
PORT=4000
DATABASE_PATH=/data/konkur.sqlite
CORS_ORIGINS=https://st.mahakaram.ir,http://localhost:8081,http://127.0.0.1:8081
SESSION_DAYS_STUDENT=30
SESSION_HOURS_ADMIN=12
SESSION_COOKIE_NAME=moshaver_session
COOKIE_SECURE=1
COOKIE_SAMESITE=Strict
ALLOW_BEARER_AUTH=0
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong random secret>
ADMIN_DISPLAY_NAME=مشاور
STUDENT_USERNAME=student
STUDENT_PASSWORD=<strong random secret>
STUDENT_DISPLAY_NAME=دانش‌آموز
TRUST_PROXY=1
LOGIN_WINDOW_MINUTES=15
LOGIN_MAX_FAILURES=5
LOGIN_BLOCK_MINUTES=15
EVENT_RETENTION_HOURS=72
```

`COOKIE_SAMESITE=Strict` is used in production. The Student and API are same-site under `mahakaram.ir`, while the recommended local Admin uses the bundled same-origin reverse proxy instead of relying on third-party cookies.

When upgrading the existing installation, keep `/data/konkur.sqlite` unless you deliberately migrate the file; this prevents an application rename from creating a new empty DB.

Test after deployment:

```bash
curl -i https://api.mahakaram.ir/health
```

Expected: HTTP 200 JSON. If the application log says it is listening on `0.0.0.0:4000` but the public URL returns Runflare's HTML 503, verify the service network/target port and health configuration.

## 2. Student PWA

Create/use a Docker service and deploy from:

```bash
cd student-app
runflare reset   # only if needed for a previously wrong deploy root
runflare deploy
```

Student service:

```text
Internal port: 80
Disk: not required
Domain: st.mahakaram.ir
```

Environment:

```env
API_PROXY_TARGET=https://api.mahakaram.ir
STUDENT_URL=https://st.mahakaram.ir
ADMIN_URL=http://localhost:8081
APP_RELEASE_NOTES=Moshaver | مشاور — نسخه 1.4.0
```

Do not set `API_BASE_URL` on the Student service. The browser-facing API base is intentionally `/api/v1`; Student Nginx proxies it to `API_PROXY_TARGET` server-side. This avoids the cookie-loss problem seen in Firefox.

Do not pin `APP_VERSION` unless you will increment it for every deployment. The Docker build generates a build version and the PWA update flow uses that value.

## 3. Local Admin against production

Use the bundled same-origin Admin server instead of `python3 -m http.server`:

```bash
cd admin-app
chmod +x run-local-admin.sh
./run-local-admin.sh
```

Equivalent command:

```bash
node local-server.js --prod --port=8081
```

Open:

```text
http://localhost:8081
```

The helper serves Admin locally and reverse-proxies `/api/v1` to
`https://api.mahakaram.ir`. This avoids third-party-cookie restrictions while
keeping the backend session HttpOnly and CSRF-protected.

Keep `http://localhost:8081` in `CORS_ORIGINS`. Production can use:

```env
COOKIE_SECURE=1
COOKIE_SAMESITE=Strict
```

## 4. Verification

- `https://api.mahakaram.ir/health` → 200.
- `https://st.mahakaram.ir` opens and can log in.
- Admin local login creates a session and `/auth/me` succeeds.
- Publish a test plan from Admin; Student sees it without a webapp redeploy.
- Send a chat message both directions; unread/read state updates.
- Start a study timer; Admin Live view displays the active session.
- Deploy a new Student image; update modal appears without interrupting an active study/quiz session.
