import { api } from "../../../shared/api/api";
import type {
  LearningResponse,
  LearningReview,
} from "../model/learning-model";
import type { LearningFormValues } from "../model/learning-form.schema";

export function getStudentLearning(
  studentId: string,
) {
  return api.get<LearningResponse>(
    `/admin/students/${studentId}/learning`,
  );
}

export function createLearningItem(
  studentId: string,
  values: LearningFormValues,
) {
  return api.post(
    `/admin/students/${studentId}/learning`,
    values,
  );
}

export function updateLearningItem(
  studentId: string,
  itemId: string,
  values: LearningFormValues,
) {
  return api.patch(
    `/admin/students/${studentId}/learning/${itemId}`,
    values,
  );
}

export function deleteLearningItem(
  studentId: string,
  itemId: string,
) {
  return api.delete(
    `/admin/students/${studentId}/learning/${itemId}`,
  );
}

export function getLearningReviewHistory(
  studentId: string,
  itemId: string,
) {
  return api.get<LearningReview[]>(
    `/admin/students/${studentId}/learning/${itemId}/reviews?limit=50`,
  );
}
