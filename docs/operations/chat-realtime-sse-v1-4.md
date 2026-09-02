# Chat + SSE Architecture

Moshaver deliberately uses REST + Server-Sent Events instead of WebSockets.

## Commands

Client → server actions use ordinary HTTP:

```text
POST /api/v1/chat/conversations/:id/messages
POST /api/v1/chat/conversations/:id/read
```

History uses:

```text
GET /api/v1/chat/conversations/:id/messages
```

Student discovers its main advisor conversation with:

```text
GET /api/v1/chat/conversation
```

Admin lists all student conversations with:

```text
GET /api/v1/admin/chat/conversations
```

## Realtime stream

Both Student and Admin open a single authenticated stream:

```text
GET /api/v1/events
```

Relevant event types include:

```text
chat.message.created
chat.messages.read
presence.changed
plan.published
plan.updated
study.started
study.finished
quiz.completed
report.submitted
recovery.requested
issue.created
notification.created
```

The backend writes realtime events to `realtime_events` and includes monotonically increasing SSE IDs. On reconnect, native EventSource can send `Last-Event-ID`; the backend replays recent relevant events before joining the live stream.

## Fallback

If EventSource is not available or reconnecting on an older browser, the Student/Admin chat performs a low-frequency history refresh. The database is always authoritative, so losing one live event does not lose a message.

## Scaling later

v1.3 keeps active SSE clients in one backend process. If the API is horizontally scaled later, add Redis Pub/Sub (or a comparable shared event broker) so an event accepted on instance A reaches a browser connected to instance B.
