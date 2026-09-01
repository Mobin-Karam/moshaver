/**
 * Backward-compatible public entry for the existing exam UI model.
 */
export {
  examDraftError,
  examReadiness,
  makeExamDraft,
  matchesExam,
} from "./model/exam-model";

export type {
  AttemptDetail,
  AttemptSummary,
  ExamDraft,
} from "./model/exam-model";
