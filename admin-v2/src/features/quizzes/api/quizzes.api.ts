import { api } from "../../../shared/api/api";
import type { QuestionDraft } from "../../questions/question-model";
import type { Quiz, QuizDraft, QuizQuestion } from "../model/quiz.types";
export const getQuizzes = () => api.get<Quiz[]>("/quizzes");
export const getQuizQuestions = (quizId: string) =>
  api.get<QuizQuestion[]>(`/quizzes/${quizId}/questions`);
export const createQuiz = (body: QuizDraft) => api.post<{ id: string }>("/quizzes", body);
export const updateQuiz = (id: string, body: QuizDraft | Partial<Quiz>) =>
  api.patch(`/quizzes/${id}`, body);
export const createQuizQuestion = (quizId: string, body: QuestionDraft) =>
  api.post(`/quizzes/${quizId}/questions`, body);
export const updateQuizQuestion = (id: string, body: QuestionDraft) =>
  api.patch(`/quiz-questions/${id}`, body);
export const deleteQuizQuestion = (id: string) => api.delete(`/quiz-questions/${id}`);
