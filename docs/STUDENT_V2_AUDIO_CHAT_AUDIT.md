# Student V2 Audio and Chat Audit

## Audio today

- `student-app-v2/src/services/relaxation-player.ts` owns one module-level `HTMLAudioElement` and a Zustand UI store.
- The player survives route changes and exposes play/pause, seek, buffering, duration, and today's admin-selected track.
- `ActivityIsland` reads the same store, so there is no second Student playback element.
- `MorePage` combines the full player and complete track list in one large visual card.
- Pause leaves the remote source attached; stop releases `src` and calls `load()`. There are no queue, speed, repeat, history, resume, bookmarks, Media Session, downloads, or data-saver settings.
- No service worker audio cache was found. That is a safe baseline: streamed responses are not intentionally cached.

## Backend and Admin audio today

- API V2 supports admin CRUD-like create/update/list for HTTPS remote tracks and Student automatic/manual daily selection.
- Tracks contain title, artist, URL and active state. The backend stores links, not binaries.
- Admin preview uses one `<audio>` element, but pause does not release its source.
- Missing: metadata, categories, artwork, playlists, personal playlists, favorites, progress, bookmarks, downloads and share slugs.

## Chat today

- Backend API V2 already supports conversations, cursor-style message history, reply references, edit/delete, reactions, read state, groups and realtime events.
- Admin V2 already has a mature split-view chat with optimistic send, drafts, reply/edit previews, reactions, search, selection, pagination and scroll restoration.
- Student V2 chat is a separate compact page. It loads a single message set and supports basic send/read/realtime, but does not reuse the mature grouping, reply, pagination, scroll-anchor, action-menu or draft behaviors.
- Attachments, voice messages, forwarding, pins and message permalinks are not supported by the current backend and must not be exposed as working actions.

## Reusable architecture

- Existing API client, authentication, Zustand, React Query in Admin, realtime browser event bridge, design tokens and safe-area shell.
- Existing remote-track API can remain compatible while track metadata and playlist endpoints are added.
- Admin chat components provide behavior references, but Student UI should use its own design-system components rather than importing Admin code.

## Required implementation order

1. Isolate one global `AudioBackend` and browser implementation; keep the current store contract compatible.
2. Add queue, progress persistence, Media Session, data saver and explicit streaming release semantics.
3. Replace the oversized More card with a compact audio page plus mini-player/Now Playing sheet.
4. Add normalized backend audio metadata, platform/user playlists and library persistence through migrations.
5. Add explicit offline-download management separate from streaming; keep service-worker caches free of arbitrary audio.
6. Add a no-op/native adapter boundary for Tauri, then implement Media3 only as a separately verified native slice.
7. Upgrade Student chat using capabilities already present in API V2; add backend contracts only for genuinely missing features.
