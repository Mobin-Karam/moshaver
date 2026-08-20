<!-- DOCS_NAV_START -->
[Docs Home](../README.md) | [Runbook](../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../student-app-v2-gap-analysis.md) | [Student Core](../student-core-architecture.md) | [Tauri](../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver | مشاور v1.4.2 — Release Notes

Focused update only. Existing exam, planner, auth, notification, SSE and inline-exam behavior are retained.

- Student chat now behaves as a viewport-contained Telegram-style conversation: composer always reachable, messages auto-scroll to the newest item, readable bubble/font sizes, compact header.
- Admin chat receives matching readability improvements without protocol changes.
- Student-visible dates are rendered in Shamsi format across Today, Schedule, Exams, Notifications and chat day separators.
- Daily plan task cards now wrap long titles/notes correctly instead of clipping/overlapping status labels.
- Added optional plan-level `motivationText`.
- Advisor can edit that text in Day Plan settings.
- JSON import accepts `motivationText` (and legacy alias `motivation`).
- Added seven-day JSON example with daily motivation messages.
- Existing database is upgraded additively with `plans.motivation_text`; no reset is required.
