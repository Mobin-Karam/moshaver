<!-- DOCS_NAV_START -->
[Docs Home](../README.md) | [Runbook](../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../student-app-v2-gap-analysis.md) | [Student Core](../student-core-architecture.md) | [Tauri](../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver | مشاور — Changelog

## 1.4.1 — Inline Exam in Daily Plan

- Plan tasks can link directly to an exam using `examId`.
- JSON imports can link same-file exams using `examRef`.
- Student can open and complete a linked exam directly from the Today/Schedule timeline without navigating to the Exams tab.
- Linked exam tasks are marked completed automatically after final exam submission.
- Admin task editor exposes a linked-exam selector for `exam` activities.
- No unrelated flows were redesigned in this patch.


## 1.4.0 — Admin Control, JSON v2 & Timed Exams

- Repaired Admin modal/import helper functions used by planner, exam, JSON and editor actions.
- Hardened Admin reload/session restoration: only a real 401 ends the session; transient errors retry without forcing login.
- Kept Student/Admin browser API calls same-origin through reverse proxies.
- Extended CORS compatibility headers with `Cache-Control` and `Pragma`.
- Rebuilt plan management for day/week/month with task CRUD, duplicate and publish-range operations.
- JSON schema v2 can import plans, timed exams, syllabus and four-option exam questions.
- Admin-selected student overrides JSON `studentId` during preview and commit.
- Added timed exam publish/open/close/duration/attempt/instructions fields.
- Added exam question editor and linked exam quiz creation.
- Student exam access is backend-enforced; future/closed/unpublished exams cannot start.
- Active exam run resumes without consuming an extra attempt.
- Default one-attempt flow plus Student retry request and Advisor approve/reject workflow.
- Added persisted `exam_attempt_requests` and Student notification/SSE events for review results.
- Student countdown is bounded by both duration and exam closing time.
- Redesigned Student/Admin chat UI while keeping REST-send + single SSE-receive architecture.
- Improved Student read/unread notification center and Admin Advisor notification center.
- Replaced simple transient feedback with custom stacked Sonner-style toast cards.
- Added custom SVG icons for send/retry/exam-ready/exam-lock/unread/double-check.
- Added UI contract test and v1.4 feature regression test.

## 1.3.3 — Auth & Sync Stabilization

- Fixed Student mutations returning `403 CSRF` after successful login.
- `/auth/me` no longer rotates the CSRF token on every request.
- Student/Admin API clients refresh CSRF once and retry a rejected mutation.
- Fixed Admin login UI initialization.
- Login/startup checks are generation-guarded.
- Reliable/idempotent logout, wrong-role cleanup and cross-tab auth synchronization.
- Kept same-origin `/api/v1` proxies for Student production and local Admin.
- Fixed Admin update-notes XSS sink.
