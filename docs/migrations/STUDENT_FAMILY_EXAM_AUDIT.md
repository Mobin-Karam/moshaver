# Student and Family exam experience audit

Date: 2026-09-06

Scope: `student-app-v2`, `student-core`, and the canonical `backend-v2` `/api/v2` assessment and Guardian contracts. The legacy `student-app/` graph is not authoritative for this phase.

## Baseline at audit start

The current application already has a five-item mobile navigation, Persian RTL styling, student-only authentication, assigned/published exam listing, server-created attempts, a server-derived deadline, local draft persistence, and an exam autosave endpoint. It does not yet provide a Family shell, preflight, section-aware exam model, honest local/server save state, conflict-safe answer reconciliation, submission review, released-result policy, or production-grade mobile assessment tests.

## Delivery matrix

| Area | Current evidence | Gap | Delivery status |
| --- | --- | --- | --- |
| Student/Guardian modes | Capability-derived mode, explicit child picker and separate Guardian adapters | Browser role-switch inspection remains environmental | Implemented |
| Mobile shell | Five thumb-friendly tabs, safe areas, badges and light/dark/system theme | Physical-device and native-shell inspection remains | Implemented |
| Dashboard | Current action plus urgent exam, remaining study, reviews, message, issue and actual weekly completion | Rich multi-week chart needs more historical data | Implemented |
| Exam center | اکنون, پیش رو, نتایج and نیازمند اقدام groups driven by server delivery state | Recovery requests remain in the existing recovery domain | Implemented |
| Pre-exam | Availability, instructions, scoring, release policy, storage/network/session/assignment checks and acknowledgement | None known | Implemented |
| Exam model | Standard/Konkur modes, generic sections, navigation rule and question metadata/media | Formula-specific renderer is not required by current content | Implemented |
| Attempt integrity | Assignment/publication/window/limit/ownership checks, server deadline, duplicate protection and fail-closed enumeration | No invasive proctoring by design | Implemented |
| Answer persistence | Immediate state/local storage, revisioned debounce, offline queue and conflict reconciliation | Native SQLite behavior not exercised in this run | Implemented |
| Timer/resume | Server time/deadline interpolation and background/online revalidation; server lazily finalizes expired attempts | Browser background lifecycle not available for live inspection | Implemented |
| Submission | Review counts, unanswered warning, explicit confirmation, pending flush and receipt | None known | Implemented |
| Results | Withheld/calculating/released policy, metrics, subject analysis and protected question review | Rank/taraz intentionally absent without population data; multi-exam trend depth is limited | Implemented with honest data boundary |
| Mistakes | Wrong answers enter the existing mistake domain and released review can classify the reason | Dedicated revision-queue polish remains in Learning/More | Implemented |
| Guardian exams | Read-only upcoming/attempt/released score and subject summary; no active answers or answer keys | Live browser role switch unavailable | Implemented |
| Accessibility | Focus styles, large controls, semantic answer sheet and automated axe checks | Automated color contrast requires a real browser | Implemented and unit-verified |
| Performance | Feature routes lazy-loaded, question media lazy-loaded, next content isolated from Admin dependencies | Network performance profiling remains environmental | Implemented |
| Verification | Unit/a11y/build, fresh migration, API parity, security E2E and expanded student/Guardian exam journey | No browser runtime was connected, so viewport screenshots are not claimed | Passed except browser/native checks |

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

## Verification evidence

- Backend: 13 Jest suites and 55 tests passed; TypeScript lint and Nest build passed.
- Student app: TypeScript, production build, 9 Vitest tests and three axe surface checks passed.
- Disposable SQLite: all 34 migrations, including `StudentExamExperience1724143100000`, applied successfully.
- API parity: Admin v2 gate reports 12 areas and 46 required integrations represented.
- Security E2E: organization/relationship/capability/CSRF/isolation matrix passed on a disposable database.
- Student exam E2E: unpublished visibility, assignment, start, resume, autosave, submit, duplicate rejection, cross-account denial, Guardian submit denial, withheld/released policy, subject review, mistake classification, expired-start denial and server timeout finalization passed.
- Browser: the configured in-app browser runtime reported no connected browser, so 360x800, 390x844, 412x915, desktop screenshots and real background/network toggling remain explicitly unverified.
