import type { Exam } from "../../../shared/types/domain";
import { normalizePersianText } from "../../../shared/lib/utils";

export type ExamDraft = {
  title: string;
  persianDate: string;
  isoDate: string;
  openAt: string;
  closeAt: string;
  durationMinutes: number;
  maxAttempts: number;
  status: NonNullable<Exam["status"]>;
  published: boolean;
  note: string;
  instructions: string;
};

export type AttemptSummary = {
  id: string;
  title?: string;
  subject?: string;
  examId?: string;
  correct: number;
  wrong: number;
  blank: number;
  percent: number;
  durationSeconds?: number;
  submittedAt?: string;
  totalQuestions?: number;
};

export type AttemptDetail = AttemptSummary & {
  examTitle?: string;
  answers: Array<{
    answerId: string;
    question: string;
    selectedOption?: string;
    correctOption: string;
    isCorrect?: number | boolean;
    explanation?: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    topic?: string;
    errorReason?: string;
    learningStatus?: string;
  }>;
};

export function makeExamDraft(
  exam?: Exam,
): ExamDraft {
  const day =
    exam?.isoDate ||
    new Date().toISOString().slice(0, 10);

  return {
    title: exam?.title || "",
    persianDate:
      exam?.persianDate || "",
    isoDate: day,
    openAt:
      exam?.openAt ||
      `${day}T08:00:00+03:30`,
    closeAt:
      exam?.closeAt ||
      `${day}T13:00:00+03:30`,
    durationMinutes:
      exam?.durationMinutes || 120,
    maxAttempts:
      exam?.maxAttempts || 1,
    status:
      exam?.status || "upcoming",
    published:
      exam?.published ?? false,
    note:
      exam?.note || "",
    instructions:
      exam?.instructions || "",
  };
}

export function examDraftError(
  data: ExamDraft,
) {
  if (!data.title.trim()) {
    return "عنوان آزمون لازم است.";
  }

  if (
    !data.persianDate.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      data.isoDate,
    )
  ) {
    return "تاریخ شمسی و تاریخ معتبر آزمون لازم است.";
  }

  const open = new Date(
    data.openAt,
  ).getTime();

  const close = new Date(
    data.closeAt,
  ).getTime();

  if (
    !Number.isFinite(open) ||
    !Number.isFinite(close) ||
    close <= open
  ) {
    return "زمان پایان باید بعد از زمان شروع باشد.";
  }

  if (
    !Number.isFinite(
      data.durationMinutes,
    ) ||
    data.durationMinutes < 1 ||
    data.durationMinutes > 600
  ) {
    return "مدت آزمون باید بین ۱ تا ۶۰۰ دقیقه باشد.";
  }

  if (
    !Number.isInteger(
      data.maxAttempts,
    ) ||
    data.maxAttempts < 1 ||
    data.maxAttempts > 100
  ) {
    return "تعداد تلاش باید عددی بین ۱ تا ۱۰۰ باشد.";
  }

  return "";
}

export function matchesExam(
  exam: Exam,
  search: string,
  status: string,
  visibility: string,
) {
  const needle =
    normalizePersianText(search)
      .trim()
      .toLocaleLowerCase("fa");

  const haystack =
    normalizePersianText(
      `${exam.title} ${exam.isoDate} ${
        exam.persianDate || ""
      } ${exam.instructions || ""}`,
    ).toLocaleLowerCase("fa");

  return (
    (!needle ||
      haystack.includes(needle)) &&
    (status === "all" ||
      exam.status === status) &&
    (visibility === "all" ||
      (visibility === "published") ===
        !!exam.published)
  );
}

export function examReadiness(
  exam: Exam,
) {
  if (
    exam.status === "cancelled"
  ) {
    return {
      tone: "neutral" as const,
      label: "لغوشده",
    };
  }

  if (
    exam.published &&
    !exam.delivery?.questionCount
  ) {
    return {
      tone: "red" as const,
      label: "منتشر بدون سؤال",
    };
  }

  if (!exam.published) {
    return {
      tone: "amber" as const,
      label: "پیش‌نویس",
    };
  }

  return {
    tone: "green" as const,
    label: "آماده دانش‌آموز",
  };
}
