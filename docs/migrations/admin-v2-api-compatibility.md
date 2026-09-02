# API Compatibility Report

Admin v2 uses existing endpoints only:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /auth/sessions`
- `DELETE /auth/sessions/:id`
- `GET /events`
- `GET /admin/students`
- `POST /admin/students`
- `GET /admin/students/:id/overview`
- `GET /admin/advisor-inbox`
- `GET /admin/plans`
- `POST /admin/plans/publish-range`
- `POST /admin/import/preview`
- `POST /admin/import/commit`
- `GET /admin/exams`
- `POST /admin/exams`
- `GET /admin/exams/:id/questions`
- `POST /admin/exams/:id/questions`
- `GET /admin/chat/conversations`
- `GET /chat/conversations/:id/messages`
- `POST /chat/conversations/:id/messages`
- `GET /admin/reports`

No backend routes were modified.

One deployment note: `.env.production` follows the requested `https://api.mahakaram.ir/api/v1`, while `.env.example` defaults to `/api/v1` to preserve the existing same-origin proxy strategy described in the root README.
