<!-- DOCS_NAV_START -->
[Docs Home](../README.md) | [Runbook](../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../student-app-v2-gap-analysis.md) | [Student Core](../student-core-architecture.md) | [Tauri](../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver | مشاور v1.4.1 — Release Notes

This is a focused patch. Existing working features were intentionally left unchanged.

## Added

- A plan activity with `type: "exam"` can be linked to a real exam.
- Student sees a **باز کردن آزمون** button directly inside that plan card.
- Clicking the plan exam opens the existing exam flow as a modal on the same page.
- Starting the exam opens the question-by-question modal without switching navigation tabs.
- After final submission, the linked plan task is automatically marked `done`.
- Admin task editor can select the linked exam.
- JSON import supports `exams[].ref` and `plans[].tasks[].examRef`.
