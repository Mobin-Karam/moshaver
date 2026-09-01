# Moshaver JSON examples

- `plan-day.example.json`: one plan with every supported activity type.
- `exam-with-questions.example.json`: one exam, syllabus and four questions.
- `complete-import.example.json`: linked plan plus exam using `examRef`.
- `/moshaver-30-day-all-task-types.json`: canonical 30-day test fixture (30 plans, 360 tasks, 30 exams and 120 questions).

In Admin, select the target student, open **ورود JSON**, preview, then commit. The Admin always overrides `studentId` with the selected student. **Save as draft** keeps every imported plan and exam unpublished; **save and publish** publishes every imported plan and exam. Use **خروجی JSON** in Planner to download the current day/week/month range. Linked exams outside the visible date range are included so `examRef` remains portable. Exports omit passwords, sessions, audit records, completion history and student private credentials.

Supported task types are `study`, `review`, `test`, `class`, `prayer`, `meal`, `break`, and `exam`. Use `examRef` to link an imported exam task to an exam in the same file. Import is transactional; unsupported schema versions, duplicate plan dates, invalid calendar dates, reversed times, invalid questions, or broken references are rejected before writes. Replacing an exam preserves its ID and attempt history while retiring its old quiz. Replacing a plan with recorded completion or study history is blocked to prevent data loss.
