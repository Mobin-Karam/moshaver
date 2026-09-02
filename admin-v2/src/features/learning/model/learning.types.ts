import type { LearningStatus } from "./learning-model";

export type LearningFilter =
  | "all"
  | "due"
  | LearningStatus;
