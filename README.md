# Moshaver | مشاور — v1.4.2

A lightweight academic-advisor system with a low-end-Android-friendly Student PWA, a laptop-oriented Advisor/Admin console, and a separate Node.js + SQLite backend.

# 📱 Moshaver v2 Student App Preview

The new Moshaver student experience is designed for low-end Android devices with a fast PWA/Tauri-ready architecture.

## Mobile Screens

<div align="center">

<table>
<tr>

<td align="center">
<img src="docs/releases/01.png" width="180">
<br>
Student Dashboard
</td>

<td align="center">
<img src="docs/releases/02.png" width="180">
<br>
Daily Plan
</td>

<td align="center">
<img src="docs/releases/03.png" width="180">
<br>
Exam System
</td>

<td align="center">
<img src="docs/releases/04.png" width="180">
<br>
Advisor Chat
</td>

<td align="center">
<img src="docs/releases/05.png" width="180">
<br>
Student Profile
</td>

</tr>
</table>

</div>

## v1.4.2 focused update

This release changes only the requested Student/Admin chat presentation, Student Shamsi date presentation, daily-task text readability and daily plan motivation text. Existing working auth, exams, inline exams, planner, SSE and notifications are kept intact.

Daily plan JSON may include `motivationText`, and the Advisor can edit the same field from the Day Plan form.

## Production topology

```text
Student PWA  https://st.mahakaram.ir
       │ same-origin /api/v1 proxy
       ▼
Backend API  https://api.mahakaram.ir/api/v1
       ▲
       │ local same-origin proxy
Admin         http://localhost:8081
```

Student browser code and local Admin browser code intentionally use `/api/v1`; the Nginx/local proxy talks to `https://api.mahakaram.ir` server-side. This keeps HttpOnly cookie sessions reliable and avoids third-party-cookie/CORS problems.

## v1.4.2 — Admin, JSON and exam-delivery rebuild

This release preserves the working v1.3 security/session foundation and focuses on the sections that were unreliable or incomplete.

### Advisor/Admin

- Fixed missing modal/import helpers that left multiple Admin controls non-functional.
- Persistent login across page reloads; transient backend/network failures do not erase an otherwise valid browser session.
- Same-origin local reverse proxy remains the required way to run Admin against production.
- Day/week/month planner: create/edit day, create/edit/delete tasks, duplicate day, draft/publish and publish range.
- JSON import schema v2 with file/drop/paste, preview, validation, conflict warnings, draft commit and direct publish.
- **The student selected in Admin is authoritative for JSON imports**; copied JSON cannot silently write to another student account.
- Timed exam manager with publish state, open/close time, duration, attempt limit, syllabus and question editor.
- Pending exam retry requests can be approved or rejected from Admin.
- Redesigned chat: conversation search, presence, quick replies, grouped messages, read receipts and SSE updates.
- Advisor notification center + Advisor Inbox for chat unread, task issues, recovery requests, overdue reviews and exam retry requests.
- Custom stacked “Sonner-style” toasts without adding a frontend framework/library.

### Student

- Timed exams stay locked until `openAt`, close after the exam window, and normally allow one submitted attempt.
- Active exam attempts resume rather than creating a second attempt.
- Local answer draft is kept while an active exam is in progress; leaving the exam does not stop server time.
- Student can request one more try after exhausting the allowed attempts; Advisor approval unlocks an extra attempt.
- Exam countdown respects both quiz duration and the exam close time.
- Better exam availability/readiness/attempt UI.
- Better Advisor chat with quick prompts, grouped messages, read state and lightweight composer.
- Notification center now keeps read/unread state, supports per-item read and “read all”.
- Improved custom toast feedback.
- Existing Focus/Today/study-session/offline/PWA behavior retained.

### Backend/security retained and extended

- HttpOnly cookie sessions; no authentication token in localStorage.
- Stable CSRF token per session + one safe frontend CSRF refresh/retry.
- Exact CORS allow-list, credential support and compatibility for `Cache-Control`/`Pragma` preflights.
- Login throttling, versioned scrypt hashes and production fail-closed secrets.
- Reliable/idempotent logout and wrong-role cleanup.
- Shared persisted SSE event stream.
- Server-authoritative study/report and quiz scoring data.
- Additive SQLite migrations; existing `/data/konkur.sqlite` is supported.
- New exam delivery fields and `exam_attempt_requests` are added without deleting existing plans/reports/chat data.

## Repository

```text
moshaver-fullstack-v1.4.2/
├── backend/
├── student-app/
├── admin-app/
├── examples/
│   ├── week-plan-and-exam-v2.json
│   └── moshaver-summer-plan-1405-28mordad-to-10mehr.json
├── tests/
├── scripts/
└── docs/
    ├── README.md
    ├── reference/
    └── releases/
```

## Run locally

Requires Node.js 22.5+.

```bash
cd moshaver-fullstack-v1.4.2
chmod +x start-dev.sh
./start-dev.sh
```

Then:

```text
Student: http://localhost:8080
Admin:   http://localhost:8081
API:     http://localhost:4000/api/v1
Health:  http://localhost:4000/health
```

The local Student and Admin servers include same-origin reverse proxies. Do not replace the Admin helper with `python3 -m http.server` when using the production backend.

## Run local Admin against production

```bash
cd admin-app
chmod +x run-local-admin.sh
./run-local-admin.sh
```

Open:

```text
http://localhost:8081
```

The browser calls `http://localhost:8081/api/v1/...`; `local-server.js` proxies those requests to `https://api.mahakaram.ir/api/v1/...`.

## JSON planning and exams

Use Admin’s student selector first, then open **Planner → JSON** or **Exams → JSON exam**.

```text
JSON file / paste
      ↓
Preview + validation
      ↓
Selected student is enforced
      ↓
Draft or Publish
      ↓
SQLite
      ↓
Student PWA
```

See `docs/reference/JSON_IMPORT_GUIDE.md` and `examples/week-plan-and-exam-v2.json`.

## Existing summer plan

The prepared summer schedule remains included as:

```text
examples/moshaver-summer-plan-1405-28mordad-to-10mehr.json
```

It can still be imported as draft, reviewed in Day/Week/Month, and then published.

## Exam lifecycle

```text
Admin creates/imports exam + questions
        ↓
Draft / Published
        ↓
Before openAt: locked
        ↓
openAt..closeAt: Start enabled
        ↓
One active run (resumable)
        ↓
Submit once
        ↓
Attempt limit reached
        ↓
Student requests another try
        ↓
Advisor approves/rejects
        ↓
Approved → one additional attempt
```

Backend—not the frontend—enforces time availability and attempt limits.

## Validation

Run before deployment:

```bash
./scripts/validate-pack.sh
```

It checks syntax, frontend/API contracts, auth/CSRF/logout, CORS, timed exam gating, one-attempt/retry approval, JSON target enforcement, JSON exam questions, chat/SSE, sessions, activity validation and notification behavior.

## Upgrade from v1.3.x

Keep your persistent DB path:

```env
DATABASE_PATH=/data/konkur.sqlite
```

Do **not** delete the DB. v1.4 runs additive schema migration at startup.

For production cookie settings keep the same-origin proxy model and use:

```env
SESSION_COOKIE_NAME=moshaver_session
COOKIE_SECURE=1
COOKIE_SAMESITE=Strict
ALLOW_BEARER_AUTH=0
```

See `docs/reference/RUNFLARE_DEPLOY.md` for deployment order.

## Current audit and runbook

Use `docs/README.md` as the documentation dashboard and `docs/REPO_AUDIT_AND_RUNBOOK.md` as the operational runbook.
