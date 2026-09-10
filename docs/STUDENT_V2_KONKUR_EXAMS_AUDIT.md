# Student App V2 Konkur Exams Audit

## Current Student Exams Architecture

### Frontend

- `student-app-v2/src/features/exam/ExamPage.tsx` owns the center, preflight, active run, review, and result states.
- `ExamAutosaveController` persists a versioned attempt draft in browser storage, batches changed answers to API V2, and reconciles by revision and client timestamp.
- `ExamRunner` already supports answer selection/clearing, review marks, previous/next navigation, an answer-sheet bottom sheet, timeout submission, and responsive layouts.
- `student-core/src/exams` centralizes availability, answer reconciliation, summaries, and server-time countdown helpers.
- Student state loads `GET /api/v2/student/exams`; the activity island can deep-link to an active exam.

### Backend

- `ExamsController` exposes canonical staff management plus authenticated `/api/v2/student/exams` list/detail/start/progress/autosave/submit/history/result endpoints.
- `ExamsService` enforces assignment ownership, publication, availability windows, attempt limits, active-attempt reuse, server-derived deadlines, question membership, basic navigation restrictions, and result release.
- `Exam`, `Question`, `ExamAssignment`, and `ExamAttempt` are persisted by TypeORM in SQLite.
- Exam questions include subject, topic, section, difficulty, source, media, and tags.
- Attempts currently store all answer state in a `simple-json` column.

## Already Reusable

- API V2 auth identity is used; the browser never supplies a trusted student id.
- Starting an exam returns an existing unfinished attempt, enabling reload/resume.
- The active runner response excludes correct answers and explanations.
- Server time and a server-derived deadline are returned and used by the client timer.
- Answer revisions prevent an older offline write from replacing newer server state.
- Results and detailed review are withheld by the existing release policy.
- Existing question metadata and JSON section configuration can be migrated without deleting records.

## Missing

- Full mode vocabulary: mock, practice, quiz, and diagnostic.
- Backend-authoritative explicit exam and attempt states.
- Separate answer-key, explanation, and ranking release timestamps.
- Latest-start, late-start, resume, timeout, section timer, session, and integrity policies.
- Normalized attempt answers with a unique attempt/question constraint and approximate timing.
- Transactional submission and persisted result snapshots.
- Topic/difficulty/time analysis and privacy-safe population statistics.
- Exam heartbeat and integrity signals.
- Dashboard/notification events for the exam lifecycle.
- Student countdown/waiting state and richer booklet navigation.

## Broken or Inconsistent

- Student list state is recomputed independently in backend and browser; API should publish the canonical status.
- `Exam.mode` only accepts `standard|konkur` and `allowBackNavigation` compresses three navigation policies into one boolean.
- Scoring rounds the total percentage during submission and subject percentages use correct-count ratio instead of the configured scoring model.
- Timeout errors use the generic `ATTEMPT_CLOSED` code, and progress performs submission as a read-side effect.
- Submission updates the attempt and creates mistake rows outside a transaction.
- No database constraint can prevent concurrent duplicate unfinished attempts.
- An upcoming exam card can open details, but the preflight has no server-reconciled countdown.

## API V2 Changes Required

- Extend the existing endpoints rather than creating a parallel controller.
- Add canonical `status`, policies, release visibility, and attempt status to list/detail responses.
- Add focused answer/review and heartbeat endpoints while retaining the current batch PATCH for offline replay compatibility.
- Make start and submit transaction-safe and idempotent.
- Split live question DTOs from released review DTOs and add explicit answer-key leakage tests.

## Database Changes Required

- Extend `exams` with policy/release fields using safe defaults derived from current behavior.
- Extend `exam_attempts` with status, expiry, heartbeat, section, submission, and score snapshot fields.
- Add normalized `exam_attempt_answers`, `exam_results`, and optional integrity-event tables through SQLite-compatible migrations.
- Preserve the legacy attempt JSON during rollout and backfill normalized answers before removing it in a later migration.

## Delivery Plan

1. Domain fields, migrations, typed contracts, and compatibility defaults.
2. Transactional attempt lifecycle, canonical status, scoring, release gates, and security tests.
3. Student waiting/details/session/booklet UX and heartbeat/recovery.
4. Persisted result, subject/topic analysis, history, dashboard, and notifications.
5. Admin V2 configuration compatibility and removal of obsolete compatibility paths.
