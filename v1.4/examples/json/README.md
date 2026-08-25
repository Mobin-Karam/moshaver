# Moshaver JSON examples

- `plan-day.example.json`: one plan with every supported activity type.
- `exam-with-questions.example.json`: one exam, syllabus and four questions.
- `complete-import.example.json`: linked plan plus exam using `examRef`.
- `/moshaver-30-day-all-task-types.json`: canonical 30-day test fixture (30 plans, 360 tasks, 30 exams and 120 questions).

In Admin, select the target student, open **ورود JSON**, preview, then commit. The Admin always overrides `studentId` with the selected student. Use **خروجی JSON** in Planner to download the current day/week/month range. Exports omit passwords, sessions, audit records and student private credentials.

Supported task types are `study`, `review`, `test`, `class`, `prayer`, `meal`, `break`, and `exam`. Use `examRef` to link an imported exam task to an exam in the same file. Import is transactional; invalid types, dates, times, questions, or references are rejected before writes.
