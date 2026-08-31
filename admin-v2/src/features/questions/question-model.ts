import { normalizePersianText } from "../../lib/utils";

export type QuestionDraft = { question: string; options: string[]; correctOption: string; explanation: string; book: string; chapter: string; lesson: string; topic: string; hint: string; sortOrder: number };
export type QuestionView = Partial<QuestionDraft> & { id?: string; text?: string; question_text?: string; option_a?: string; option_b?: string; option_c?: string; option_d?: string; correctAnswer?: string; correct_option?: string; sort_order?: number };

export const emptyQuestion = (): QuestionDraft => ({ question: "", options: ["", "", "", ""], correctOption: "a", explanation: "", book: "", chapter: "", lesson: "", topic: "", hint: "", sortOrder: 1 });

export function questionDraft(item: QuestionView, index = 0): QuestionDraft {
  return { ...emptyQuestion(), question: item.question || item.question_text || item.text || "", options: item.options || [item.option_a || "", item.option_b || "", item.option_c || "", item.option_d || ""], correctOption: item.correctOption || item.correct_option || item.correctAnswer || "a", explanation: item.explanation || "", book: item.book || "", chapter: item.chapter || "", lesson: item.lesson || "", topic: item.topic || "", hint: item.hint || "", sortOrder: item.sortOrder || item.sort_order || index + 1 };
}

export function questionError(draft: QuestionDraft) {
  if (!draft.question.trim()) return "صورت سؤال را وارد کنید.";
  if (draft.options.length !== 4 || draft.options.some((option) => !option.trim())) return "هر چهار گزینه باید تکمیل شوند.";
  const unique = new Set(draft.options.map((option) => normalizePersianText(option).trim().toLocaleLowerCase("fa")));
  if (unique.size !== 4) return "گزینه‌های تکراری مجاز نیستند.";
  return ["a", "b", "c", "d"].includes(draft.correctOption) ? "" : "پاسخ صحیح معتبر نیست.";
}

export function questionMatches(item: QuestionView, search: string) {
  const needle = normalizePersianText(search).trim().toLocaleLowerCase("fa");
  if (!needle) return true;
  return normalizePersianText([item.question, item.question_text, item.text, item.book, item.chapter, item.lesson, item.topic, ...(item.options || []), item.option_a, item.option_b, item.option_c, item.option_d].filter(Boolean).join(" ")).toLocaleLowerCase("fa").includes(needle);
}
