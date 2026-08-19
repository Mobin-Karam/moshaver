# Moshaver JSON Import Guide — schemaVersion 2

Admin can import plans and timed exams for the **student currently selected in the Admin top bar**. The selected Admin student is authoritative: a copied `studentId` inside the JSON is ignored/overridden so the file cannot silently target the wrong account.

Recommended flow:

```text
Select student in Admin
  → Planner / Exams → JSON
  → upload or paste JSON
  → Preview + validation
  → fix conflicts / warnings
  → Import as Draft OR Import + Publish
  → database
  → Student sees published content
```

## Full schema example

```json
{
  "schemaVersion": 2,
  "plans": [
    {
      "planDate": "2026-08-20",
      "jalaliId": "1405-05-29",
      "dayLabel": "پنج‌شنبه",
      "persianDate": "۲۹ مرداد ۱۴۰۵",
      "title": "برنامه روزانه",
      "published": false,
      "tasks": [
        {
          "start": "07:00",
          "end": "08:10",
          "type": "study",
          "subject": "روان‌شناسی",
          "title": "مطالعه فعال درس ۱",
          "pages": "۸ تا ۲۱",
          "testCount": 0,
          "note": "بعد از مطالعه کتاب را ببند و بازیابی کن"
        }
      ]
    }
  ],
  "exams": [
    {
      "title": "آزمون نمونه",
      "isoDate": "2026-08-21",
      "persianDate": "۳۰ مرداد ۱۴۰۵",
      "status": "upcoming",
      "published": true,
      "openAt": "2026-08-21T08:00:00+03:30",
      "closeAt": "2026-08-21T10:00:00+03:30",
      "durationMinutes": 60,
      "maxAttempts": 1,
      "instructions": "بعد از شروع، زمان متوقف نمی‌شود. هر سؤال را با دقت پاسخ بده.",
      "syllabus": [
        {
          "subject": "روان‌شناسی",
          "description": "درس ۱ — صفحه ۸ تا ۲۱",
          "required": true,
          "track": "دوازدهم"
        }
      ],
      "questions": [
        {
          "question": "صورت سؤال نمونه",
          "options": ["گزینه اول", "گزینه دوم", "گزینه سوم", "گزینه چهارم"],
          "answer": "b",
          "explanation": "توضیح پاسخ صحیح"
        }
      ]
    }
  ]
}
```

`correctOption` may be used instead of `answer`. Valid correct answers are `a`, `b`, `c`, `d` (numeric `0`–`3` is also normalized by the importer). Every exam question must have exactly four non-empty options.

Task types: `study`, `review`, `test`, `class`, `prayer`, `meal`, `break`, `exam`.

A day is one plan object. A week is normally seven plan objects. A month is 28–31 plan objects; there is no separate month schema because the Admin calendar groups plan dates automatically.

## Timed exam behavior

- `published: false`: Student cannot start it.
- Before `openAt`: visible as scheduled/locked, but Start is disabled by the backend.
- Between `openAt` and `closeAt`: Start becomes available if questions exist and an attempt is available.
- Default `maxAttempts` is `1`.
- Reopening the same active attempt resumes it; it does not consume a second attempt.
- After a submitted attempt exhausts the limit, Student can request another try.
- Advisor approves/rejects that request in Admin. Approval grants one additional attempt for the approval window.

## Preview and commit guarantees

Preview does not write anything. Commit uses a database transaction. Existing same-date plans and same-title/date exams are rejected unless the Advisor explicitly enables the relevant replacement checkbox.

Use **Import as Draft** for large week/month files, inspect Day/Week/Month in Admin, then publish the chosen range. Use **Import + Publish** only when the preview is already final.

See `examples/week-plan-and-exam-v2.json` for a ready-to-edit file.

## v1.4.1 — Link an exam directly into the daily plan

To make an exam appear as a runnable card inside the Student **Today / Plan** timeline, give the exam a stable `ref` and use the same value as `examRef` on a task with `type: "exam"`.

```json
{
  "plans": [{
    "planDate": "2026-08-21",
    "tasks": [
      {"start":"07:00","end":"08:00","type":"study","subject":"روان‌شناسی","title":"مطالعه درس ۱"},
      {"start":"08:10","end":"08:35","type":"exam","subject":"روان‌شناسی","title":"آزمون تمرینی درس ۱","examRef":"psy-1"}
    ]
  }],
  "exams": [{
    "ref":"psy-1",
    "title":"آزمون تمرینی درس ۱",
    "isoDate":"2026-08-21",
    "persianDate":"۳۰ مرداد ۱۴۰۵",
    "openAt":"2026-08-21T08:10:00+03:30",
    "closeAt":"2026-08-21T09:00:00+03:30",
    "durationMinutes":25,
    "published":true,
    "questions":[]
  }]
}
```

The Student does not have to switch to the Exams tab. The exam opens from the plan card and the question runner stays in a modal over the same page. Final submission automatically completes the linked exam task.


## v1.4.2 — پیام انگیزشی روزانه

هر plan می‌تواند یک متن اختیاری `motivationText` داشته باشد. این متن در صفحه «امروز» و در نمایش برنامه همان روز برای دانش‌آموز دیده می‌شود و مشاور می‌تواند بعداً از «مشخصات روز» آن را تغییر دهد.

```json
{
  "planDate": "2026-08-19",
  "persianDate": "۲۸ مرداد ۱۴۰۵",
  "title": "برنامه روزانه",
  "motivationText": "امروز فقط روی قدم بعدی تمرکز کن؛ پیشرفت از همین قدم‌های کوچک ساخته می‌شود.",
  "published": true,
  "tasks": []
}
```

نمونه هفت‌روزه آماده در `examples/week-plan-with-motivation.json` قرار دارد.
