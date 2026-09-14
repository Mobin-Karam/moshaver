import type { Exam } from "../../../shared/types/domain";
import type { RetryRequest } from "../../exams/model/exam.types";

export type EducationMetric = {
  key: string;
  label: string;
  value: number;
  tone: "brand" | "success" | "muted";
};

function localDay(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function educationMetrics(
  exams: readonly Exam[],
  retries: readonly RetryRequest[],
  now = new Date(),
): EducationMetric[] {
  const today = localDay(now);
  const questionTotal = exams.reduce((sum, exam) => sum + (exam.delivery?.questionCount || 0), 0);
  const activeAttempts = exams.reduce(
    (sum, exam) => sum + (exam.delivery?.activeAttemptCount || 0),
    0,
  );
  const completedAttempts = exams.reduce(
    (sum, exam) => sum + (exam.delivery?.completedAttemptCount || 0),
    0,
  );

  return [
    {
      key: "today",
      label: "آزمون امروز",
      value: exams.filter((exam) => exam.isoDate === today).length,
      tone: "brand",
    },
    {
      key: "upcoming",
      label: "پیش رو",
      value: exams.filter((exam) => ["scheduled", "upcoming"].includes(exam.status || "")).length,
      tone: "brand",
    },
    {
      key: "draft",
      label: "پیش نویس",
      value: exams.filter((exam) => !exam.published || exam.status === "draft").length,
      tone: "muted",
    },
    {
      key: "published",
      label: "منتشرشده",
      value: exams.filter((exam) => exam.published).length,
      tone: "success",
    },
    { key: "active", label: "تلاش فعال", value: activeAttempts, tone: "brand" },
    { key: "completed", label: "تلاش تکمیل شده", value: completedAttempts, tone: "success" },
    {
      key: "retries",
      label: "درخواست بازیابی",
      value: retries.filter((item) => !item.status || item.status === "pending").length,
      tone: "muted",
    },
    { key: "questions", label: "سؤال در آزمون ها", value: questionTotal, tone: "brand" },
  ];
}

export function subjectDistribution(exams: readonly Exam[]) {
  const counts = new Map<string, number>();
  for (const exam of exams) {
    const subjects = exam.subjects?.length ? exam.subjects : exam.subject ? [exam.subject] : [];
    for (const subject of new Set(subjects)) counts.set(subject, (counts.get(subject) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([subject, count]) => ({ subject, count }))
    .sort(
      (left, right) => right.count - left.count || left.subject.localeCompare(right.subject, "fa"),
    );
}
