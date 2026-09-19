import { api } from "../../../shared/api/api";
import type { QuestionDraft } from "../../questions/question-model";
import type { Quiz, QuizDraft, QuizQuestion } from "../model/quiz.types";
export const getQuizzes = () => api.get<Quiz[]>("/quizzes");
type QuizQuestionResponse = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  sortOrder?: number;
};
export const getQuizQuestions = async (quizId: string): Promise<QuizQuestion[]> =>
  (await api.get<QuizQuestionResponse[]>(`/quizzes/${quizId}/questions`)).map(fromResponse);
export const createQuiz = (body: QuizDraft) => api.post<{ id: string }>("/quizzes", body);
export const updateQuiz = (id: string, body: QuizDraft | Partial<Quiz>) =>
  api.patch(`/quizzes/${id}`, body);
export const createQuizQuestion = (quizId: string, body: QuestionDraft) =>
  api.post(`/quizzes/${quizId}/questions`, toRequest(body));
export const updateQuizQuestion = (id: string, body: QuestionDraft) =>
  api.patch(`/quiz-questions/${id}`, toRequest(body));
export const deleteQuizQuestion = (id: string) => api.delete(`/quiz-questions/${id}`);

function toRequest(question: QuestionDraft) {
  const correctIndex = ["a", "b", "c", "d"].indexOf(question.correctOption);
  return {
    text: question.question,
    options: question.options,
    correctAnswer: question.options[correctIndex] || "",
    explanation: question.explanation,
    sortOrder: question.sortOrder,
  };
}

function fromResponse(question: QuizQuestionResponse): QuizQuestion {
  const correctIndex = question.options.indexOf(question.correctAnswer);
  return {
    id: question.id,
    question: question.text,
    options: question.options,
    correctOption: ["a", "b", "c", "d"][correctIndex] || "a",
    explanation: question.explanation || "",
    sortOrder: question.sortOrder || 1,
  };
}
