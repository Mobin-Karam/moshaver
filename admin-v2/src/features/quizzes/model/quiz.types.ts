import type { QuestionView } from "../../questions/question-model";
export type Quiz = { id:string; title:string; subject?:string; duration_minutes?:number; active?:number|boolean; exam_id?:string; exam_title?:string; question_count?:number };
export type QuizDraft = { title:string; subject:string; durationMinutes:number };
export type QuizQuestion = QuestionView & { id:string };
