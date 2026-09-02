# Tauri Student App Architecture

Date: 2026-08-20

## Project

`student-app-v2/` is the new multi-platform student shell. It does not replace the frozen static v1 app. It consumes `@moshaver/student-core` for planner, exam, chat, notification, storage, and sync decisions.

## Stack

- Tauri v2
- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- React Router

## Platforms

Configured targets:

- Web: Vite build output in `dist/`
- Linux: Tauri desktop bundle targets `deb` and `appimage`
- Android: Tauri mobile with `minSdkVersion` 24, covering Android 7+

Future targets:

- Windows
- macOS
- iOS

## Runtime Boundaries

- `student-core/`: pure business logic and provider interfaces.
- `student-app-v2/src/services/`: API and app state.
- `student-app-v2/src/storage/`: web storage adapter.
- `student-app-v2/src/native/`: native adapter placeholders.
- `student-app-v2/src/sync/`: sync status and orchestration wiring.
- `student-app-v2/src-tauri/`: native shell, commands, capabilities, bundle settings.

## Low Android Rules

- Keep route components lightweight.
- Avoid large animation libraries.
- Split vendor chunks for React and icons.
- Use SVG icons and small CSS.
- Keep initial UI list sizes small; use virtual lists when real datasets are connected.
- Store offline data behind `StorageProvider`; Tauri storage must use SQLite in the native storage phase.
- Clean up realtime subscriptions and timers when routes unmount.

## Native Storage

`TauriSQLiteProvider` uses `@tauri-apps/plugin-sql` and `tauri-plugin-sql` with SQLite. It initializes the offline-first schema at database open:

- `local_tasks`
- `local_plans`
- `local_exams`
- `local_questions`
- `local_answers`
- `local_messages`
- `sync_queue`
- `settings`

Business code must continue to depend only on `StorageProvider`.

`SQLiteSyncProvider` stores queued mutations in `sync_queue` and implements the shared `SyncProvider` interface. The core sync functions decide conflict policies; the provider only persists queue state.
