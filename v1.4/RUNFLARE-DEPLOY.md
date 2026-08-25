# Moshaver v1.6 — separate Runflare deployments

Deploy the three directories as three independent Docker services. Each directory is a complete Docker build context and has its own `Dockerfile`.

## 1. Backend

- Project root/build context: `v1.4/backend`
- Dockerfile: `Dockerfile`
- Container port: `4000`
- Network type: NodePort (public API)
- Domain: `api.mahakaram.ir`
- Health path: `/health`
- Persistent disk mount: `/data`
- Environment template: `backend/runflare.env.example`

Create and attach the disk before first production traffic. SQLite, uploads, and database backups use `/data`; deploying a new image must not replace that directory. Never run the month seed against a production student unless the test data is wanted.

After the first healthy boot, optional demo/test-month seed commands are:

```bash
npm run seed
npm run seed:test-month
```

The normal server boot creates/migrates the schema and ensures the configured admin/student accounts. `seed:test-month` adds the detailed 30-day test fixture and is intentionally manual.

## 2. Student app

- Project root/build context: `v1.4/student-app`
- Dockerfile: `Dockerfile`
- Container port: `80`
- Network type: NodePort
- Domain: `st.mahakaram.ir`
- Health path: `/health`
- Persistent disk: none
- Environment template: `student-app/runflare.env.example`

The browser calls `/api/v1` on the student domain. Nginx forwards it to `API_PROXY_TARGET`, keeping the session cookie first-party and avoiding browser CORS dependency.

## 3. Admin app

- Project root/build context: `v1.4/admin-app`
- Dockerfile: `Dockerfile`
- Container port: `80`
- Network type: NodePort
- Domain: `admin.mahakaram.ir`
- Health path: `/health`
- Persistent disk: none
- Environment template: `admin-app/runflare.env.example`

`API_PROXY_TARGET` powers the Server choice on login. `LOCAL_API_PROXY_TARGET` powers the Local choice. In Runflare, point the latter at an internal backend URL if Runflare provides one; otherwise use the same public HTTPS API URL. Do not use `host.docker.internal` in Runflare.

## Deployment order

1. Push the committed branch to the Git provider connected to Runflare.
2. Create the backend Docker service, attach `/data`, enter backend variables, map port 4000, and verify `https://api.mahakaram.ir/health`.
3. Create the student Docker service, enter its variables, map port 80, and verify `https://st.mahakaram.ir/health` and login.
4. Create the admin Docker service, enter its variables, map port 80, and verify `https://admin.mahakaram.ir/health`, both login-source choices, chat, and planner JSON import/export.
5. Confirm TLS is active before using production credentials. Keep `COOKIE_SECURE=1` in production.

For CLI deployments, run `runflare deploy` from the relevant service directory on its first deployment so Runflare records the correct project root:

```bash
cd v1.4/backend && runflare deploy
cd v1.4/student-app && runflare deploy
cd v1.4/admin-app && runflare deploy
```

Do not paste real passwords into an env file in Git. Set them in Runflare and rotate the example credentials before exposing the backend.

## Upgrade checklist

- Back up `/data/moshaver.sqlite` and verify a recent backup before backend upgrades.
- Deploy backend first and wait for `/health` to return 200.
- Deploy student and admin independently.
- In each app, verify login, `/auth/me`, chat history loading, sending a message, and logout.
- In admin, verify Server/Local source selection and export a planner JSON file.
- If an app shows an old version, unregister its service worker or hard-refresh after confirming `/version.json` changed.

