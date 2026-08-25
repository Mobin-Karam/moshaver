# Student App v1.6.0 Update Report

## Goal

Turn exams and mistakes into an ongoing learning workflow while keeping the existing small vanilla-JavaScript PWA fast on low-end Android devices.

## Exam and practice history

The Exams screen now includes attempt history. A student can reopen a completed attempt and see:

- score, correct/wrong/blank counts and duration;
- every question;
- all four options;
- selected answer;
- correct answer;
- answer explanation;
- book/chapter/lesson/topic metadata;
- review hint;
- linked personal learning item.

The immediate post-submit result also links directly into this detailed review.

## Learning journal

The Progress screen now contains a learning/review center. Students can:

- create their own learning items;
- edit or delete them;
- attach subject/book/chapter/lesson/topic context;
- write personal notes;
- write a hint for their future self;
- choose a due date;
- mark a review complete and rate mastery 1–5;
- see the next review date calculated by the backend.

Wrong and blank quiz answers automatically enter the learning journal once, so the student does not have to manually copy every mistake.

## Reminders

Due learning items are surfaced on the Today dashboard. A student can jump directly from the reminder to the learning item.

When an advisor creates or updates a learning item, the app receives `learning.updated` through the existing SSE connection and refreshes the learning/dashboard state.

## Better analysis

The learning summary uses real stored behavior rather than a black-box score:

- due and pending learning count;
- average mastery;
- attempt count and average exam score;
- subject-level learning load/mastery;
- mistake-reason patterns.

## Realtime detail for advisor

Major navigation changes produce a bounded `screen.viewed` activity event, allowing the advisor live view to distinguish, for example, exam/history review from the learning center or chat. Existing rate limits and the current activity API are preserved.

## Performance

No React or large UI library was introduced. The app remains plain JavaScript/CSS, uses the current service worker, and keeps history/review lists bounded by backend limits.

## Validation

Run:

```bash
./check-student.sh
```

It validates JavaScript syntax, static/service-worker asset references, required v1.6 UI targets and duplicate HTML IDs.
