# Admin v2 Communication workspace

Last source verification: 2026-09-07.

The Communication workspace groups the operational surfaces used to observe a learner, contact them, and follow durable alerts. It is a navigation grouping, not a relaxation of backend authorization.

## Canonical routes

| Page | Admin route | Backend contracts | Access boundary |
| --- | --- | --- | --- |
| Live | `/admin/communication/live` | `GET /live`, `GET /attention`, `GET /students/:id/activity`, `GET /events` | `student.live.read` and student scope |
| Chat | `/admin/communication/chat` | `/chat/conversations`, nested messages, group members and reactions, `GET /events` | `chat.read`/`chat.send` plus active conversation membership |
| Notifications | `/admin/communication/notifications` | `/notifications`, advisor inbox, `/push/*`, `GET /events` | authenticated user ownership; advisor actions keep their own capabilities |

The historical `/admin/live`, `/admin/chat`, and `/admin/notifications` URLs redirect to the canonical routes while retaining search parameters and fragments. Notification deep links are normalized to the canonical destinations.

## Runtime contracts

The backend `/live` response is currently a scoped array of students with nested `presence` and `attention` objects. The Admin boundary adapter converts it into the page snapshot used by the UI and derives totals from those actual rows. It maps only supported data:

- presence state and last-seen time;
- current task title;
- missed-task, recovery, and task-issue attention signals;
- attention score and tenant-scoped student identity.

Unsupported values such as due-review totals or last-exam percentage remain neutral instead of being fabricated. The page uses backend attention signals for its alert state and visible metrics.

Notification types are normalized at the API boundary because backend v2 stores enum-style values such as `MESSAGE`, `EXAM_REMINDER`, and `PLAN_UPDATE`, while the UI uses the presentation categories `message`, `exam`, `lesson`, and `announcement`. The adapter also accepts the historical `message` body alias.

Chat messages normalize backend enum casing and both `text`/`content` fields. Non-text cards retain their human-readable content.

## Realtime behavior

`GET /events` is an authenticated SSE stream. Canonical event names are:

- `chat.message.created`, with `{ conversationId, message }`;
- `notification.created`, with the public notification object;
- `system.update` for connection and heartbeat signals.

Queries remain the durable source of truth. SSE updates the active cache immediately; periodic query refresh remains the recovery path after disconnects.

## UI states

Each page provides loading, empty, error/retry, responsive, and keyboard-accessible states. Live and Notifications use separate mobile panels where a desktop multi-column view would not fit. Chat retains per-conversation drafts, history scrolling, reply/edit/delete/reaction controls, and optimistic sending.

Real Web Push receipt still requires a configured VAPID environment and an actual browser. SSE and in-app notification tests do not prove background push delivery.
