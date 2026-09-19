import type { QuestionView } from "../../questions/question-model";
export type Quiz = {
  id: string;
  title: string;
  subject?: string;
  durationMinutes: number;
  active: boolean;
  exam?: { id: string; title: string } | null;
  questions: Array<{ id: string }>;
};
export type QuizDraft = { title: string; subject: string; durationMinutes: number };
export type QuizQuestion = QuestionView & { id: string };
