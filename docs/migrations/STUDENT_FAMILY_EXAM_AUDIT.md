# Student and Family exam experience audit

Date: 2026-09-06

Scope: `student-app-v2`, `student-core`, and the canonical `backend-v2` `/api/v2` assessment and Guardian contracts. The legacy `student-app/` graph is not authoritative for this phase.

## Baseline

The current application already has a five-item mobile navigation, Persian RTL styling, student-only authentication, assigned/published exam listing, server-created attempts, a server-derived deadline, local draft persistence, and an exam autosave endpoint. It does not yet provide a Family shell, preflight, section-aware exam model, honest local/server save state, conflict-safe answer reconciliation, submission review, released-result policy, or production-grade mobile assessment tests.

## Delivery matrix

| Area | Current evidence | Gap | Delivery status |
| --- | --- | --- | --- |
| Student/Guardian modes | Student login rejects every non-student role; Guardian backend exists | No capability-driven Family UI or child selection | Planned |
| Mobile shell | Five tabs and safe-area bottom padding | Missing theme controls, badges, route recovery, stronger 360px ergonomics | Planned |
| Dashboard | Greeting, today plan, current task | Missing urgent exam, reviews, advisor message, issue and weekly trend | Planned |
| Exam center | Assigned published exams and start button | Missing four state sections, results and action-required states | Planned |
| Pre-exam | None | Full preflight, rules acknowledgement, scoring and release policy | Planned |
| Exam model | One-question pages | Missing generic modes, sections, navigation policy and media metadata | In progress |
| Attempt integrity | Assignment, publication, attempt limit, ownership and duration checked server-side | Start window is not enforced; timeout finalization and audit receipt need strengthening | Planned |
| Answer persistence | Whole-answer local draft and server PATCH endpoint exist separately | No debounced autosave, durable per-answer timestamps, retry queue or reconciliation | In progress |
| Timer/resume | Deadline calculated by backend and local countdown based on start time | Client ignores returned `remainingSeconds`; visibility resume does not revalidate | In progress |
| Submission | Direct final-question submit; backend duplicate submit is idempotent | No review/confirmation, pending flush state or receipt | Planned |
| Results | Score and answer key returned immediately | No release policy, result states, subject analysis or protected review | Planned |
| Mistakes | Existing mistake domain | Exam review is not connected to it | Planned |
| Guardian exams | Related-child exam summaries | No attempt/released-result summary; Family frontend absent | Planned |
| Accessibility | Large answer cards | No navigator semantics, focus flow, zoomable media or automated checks | Planned |
| Performance | Small single route | No explicit lazy route boundary or budget gate | Planned |
| Verification | Core and backend unit tests exist | Missing Student app unit/a11y/browser suites and complete admin-to-family journey | Planned |

## Architecture direction

1. Keep exam domain rules framework-neutral in `student-core`.
2. Extend `backend-v2` as the authority for availability, deadline, attempt ownership, scoring and result release.
3. Store device answer envelopes with timestamps/revisions, queue only attempt-scoped idempotent autosaves, and reconcile explicitly.
4. Split Student and Guardian data adapters while sharing a learner/family shell; never expose student mutation methods in Guardian mode.
5. Build the exam center, preflight, runner, submission receipt and released-result workspace as separate route states.

## Release boundaries

- Offline state may preserve and queue answers, but the UI must not call them server-saved until acknowledged.
- Browser, native SQLite, background lifecycle and real network interruption remain pending until exercised in their actual runtimes.
- Rank, percentile and taraz remain absent unless the backend has a valid population calculation.
