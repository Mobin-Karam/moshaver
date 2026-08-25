"use strict";

var fs = require("node:fs");
var path = require("node:path");

var root = path.resolve(__dirname, "..");
var start = new Date("2026-08-25T00:00:00Z");
var weekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
var subjects = ["ریاضی و آمار", "علوم و فنون ادبی", "عربی", "فلسفه و منطق", "روان‌شناسی", "جامعه‌شناسی", "تاریخ", "جغرافیا"];

function iso(day) {
  var d = new Date(start.getTime() + day * 86400000);
  return d.toISOString().slice(0, 10);
}
function questions(day) {
  var subject = subjects[day % subjects.length];
  return [0, 1, 2, 3].map(function (n) {
    var answer = ["a", "b", "c", "d"][(day + n) % 4];
    return {
      question: "سؤال آزمایشی " + (n + 1) + " روز " + (day + 1) + " از " + subject + "؛ گزینه درست را انتخاب کنید.",
      options: ["گزینه الف", "گزینه ب", "گزینه ج", "گزینه د"],
      correctOption: answer,
      explanation: "این سؤال برای آزمایش کامل جریان آزمون، ثبت پاسخ، نتیجه و مرور پاسخ‌ها در روز " + (day + 1) + " ساخته شده است.",
      sortOrder: n + 1,
    };
  });
}
function task(startTime, endTime, type, subject, title, pages, testCount, note, examRef) {
  var value = { start: startTime, end: endTime, type: type, subject: subject, title: title, pages: pages || "", testCount: testCount || 0, note: note };
  if (examRef) value.examRef = examRef;
  return value;
}

var exams = [];
var plans = [];
for (var day = 0; day < 30; day++) {
  var date = iso(day);
  var subject = subjects[day % subjects.length];
  var second = subjects[(day + 3) % subjects.length];
  var ref = "month-test-day-" + String(day + 1).padStart(2, "0");
  exams.push({
    ref: ref,
    title: "آزمون روز " + (day + 1) + " — " + subject,
    persianDate: "روز " + (day + 1) + " از برنامه آزمایشی یک‌ماهه",
    isoDate: date,
    openAt: date + "T15:00:00+03:30",
    closeAt: date + "T20:00:00+03:30",
    durationMinutes: 45,
    maxAttempts: 1,
    published: true,
    status: "upcoming",
    note: "آزمون روزانه برای سنجش یادگیری و آزمایش اتصال مستقیم فعالیت exam به آزمون.",
    instructions: "در محیط آرام شروع کنید؛ ابتدا همه سؤال‌ها را مرور، سپس پاسخ دهید و بعد از ثبت نتیجه، پاسخ‌های نادرست را تحلیل کنید.",
    syllabus: [{ subject: subject, description: "مباحث مطالعه و مرور روز " + (day + 1), required: true, track: "آزمون روزانه" }],
    questions: questions(day),
  });
  plans.push({
    planDate: date,
    jalaliId: "test-month-day-" + (day + 1),
    dayLabel: weekdays[new Date(date + "T00:00:00Z").getUTCDay()],
    persianDate: "روز " + (day + 1) + " از دوره آزمایشی ۳۰ روزه",
    title: "برنامه جامع روز " + (day + 1) + " — تمرکز بر " + subject,
    motivationText: "روز " + (day + 1) + ": هر فعالیت را با تمرکز انجام بده، نتیجه تست و آزمون را ثبت کن و نکته‌های اشتباه را به مرور فردا منتقل کن.",
    published: true,
    tasks: [
      task("06:15", "06:30", "prayer", "", "نماز و آماده‌سازی ذهن", "", 0, "پس از نماز، سه هدف اصلی روز را مرور کن."),
      task("06:30", "07:00", "meal", "", "صبحانه و آب‌رسانی", "", 0, "صبحانه سبک؛ تلفن همراه کنار گذاشته شود."),
      task("07:00", "08:20", "study", subject, "مطالعه عمیق " + subject, "صفحات " + (10 + day * 2) + " تا " + (25 + day * 2), 0, "تیترها، تعریف‌ها و مثال‌ها را یادداشت کن؛ در پایان بدون کتاب بازگویی کن."),
      task("08:35", "09:35", "class", second, "کلاس و حل مثال " + second, "جزوه جلسه " + (day + 1), 0, "نکات مبهم را علامت بزن و حداقل دو پرسش برای پیگیری ثبت کن."),
      task("09:35", "09:50", "break", "", "استراحت فعال", "", 0, "حرکت کششی، آب و دوری کامل از صفحه نمایش."),
      task("09:50", "10:35", "review", subject, "مرور فعال و فلش‌کارت", "خلاصه همان روز", 0, "از روش بازیابی فعال استفاده کن؛ موارد فراموش‌شده را ستاره‌دار کن."),
      task("10:50", "11:35", "test", subject, "تست آموزشی زمان‌دار", "", 20 + (day % 4) * 5, "سه دسته درست، شک‌دار و غلط بساز؛ زمان هر سؤال را ثبت کن."),
      task("12:15", "12:30", "prayer", "", "نماز و توقف نیم‌روز", "", 0, "بدون بررسی شبکه‌های اجتماعی، ذهن را برای نیمه دوم روز بازنشانی کن."),
      task("12:30", "13:15", "meal", "", "ناهار و استراحت", "", 0, "ناهار متعادل و ۱۰ دقیقه استراحت آرام."),
      task("15:00", "15:45", "exam", subject, "آزمون روز " + (day + 1) + " — " + subject, "", 4, "از همین فعالیت آزمون را باز کن؛ پس از پایان نتیجه و پاسخ‌ها را بررسی کن.", ref),
      task("16:00", "16:35", "review", subject, "تحلیل آزمون و دفتر خطا", "پاسخ‌نامه روز " + (day + 1), 0, "علت هر پاسخ غلط یا نزده را بنویس و یک اقدام اصلاحی مشخص تعیین کن."),
      task("19:00", "19:30", "study", second, "جمع‌بندی سبک " + second, "خلاصه و نکات علامت‌دار", 0, "فقط تثبیت؛ مطلب تازه شروع نشود. برنامه فردا را در دو جمله آماده کن."),
    ],
  });
}

var bundle = { schemaVersion: 2, studentId: null, fixture: { name: "30-day-all-task-types", startDate: iso(0), endDate: iso(29), days: 30, taskTypes: ["study", "review", "test", "class", "prayer", "meal", "break", "exam"] }, plans: plans, exams: exams };
fs.writeFileSync(path.join(root, "moshaver-30-day-all-task-types.json"), JSON.stringify(bundle, null, 2) + "\n");
fs.writeFileSync(path.join(root, "backend", "seed", "moshaver-30-day-all-task-types.json"), JSON.stringify(bundle, null, 2) + "\n");
fs.mkdirSync(path.join(root, "examples", "json"), { recursive: true });
fs.writeFileSync(path.join(root, "examples", "json", "plan-day.example.json"), JSON.stringify({ schemaVersion: 2, studentId: null, plans: [plans[0]], exams: [] }, null, 2) + "\n");
fs.writeFileSync(path.join(root, "examples", "json", "exam-with-questions.example.json"), JSON.stringify({ schemaVersion: 2, studentId: null, plans: [], exams: [exams[0]] }, null, 2) + "\n");
fs.writeFileSync(path.join(root, "examples", "json", "complete-import.example.json"), JSON.stringify({ schemaVersion: 2, studentId: null, plans: [plans[0]], exams: [exams[0]] }, null, 2) + "\n");
console.log("Generated 30 plans, " + plans.reduce(function (n, p) { return n + p.tasks.length; }, 0) + " tasks, 30 exams and 120 questions.");
