/**
 * Backward-compatible public entry for the learning model.
 */
export {
  isLearningDue,
  learningStatusLabel,
} from "./model/learning-model";

export type {
  LearningItem,
  LearningResponse,
  LearningReview,
  LearningStatus,
  LearningSummary,
} from "./model/learning-model";
