# Chat UI/UX Upgrade

This package keeps the existing chat backend contracts unchanged and adds client-side usability features.

## Added

- Search inside currently loaded messages with next/previous navigation.
- `Ctrl/Cmd + F` to open message search.
- `Ctrl/Cmd + K` to focus conversation search.
- `Alt + Up/Down` to move between visible conversations.
- Click a reply preview to jump to the referenced loaded message and highlight it.
- Per-conversation scroll position memory using `sessionStorage`.
- Local favorite/starred conversations using `localStorage`.
- Sidebar filters for favorites, drafts, online, unread, direct chats, and groups.
- Sidebar sorting by latest activity, unread first, online first, or name.
- Draft preview directly in the conversation list.
- Copy-message action with Clipboard API and a fallback.
- Expanded reaction picker using the existing reaction API.
- Custom quick replies stored locally, including `{name}` substitution.
- Auto-growing composer and clearer keyboard hints.
- Existing sticky date separators and realtime behavior preserved.

## No backend changes

All new persistence is browser-side (`localStorage` / `sessionStorage`). Existing send/edit/delete/reaction/read/realtime API paths are unchanged.
