import { ExamScoringService } from "../src/modules/exams/exam-scoring.service";

describe("ExamScoringService", () => {
  it("calculates Konkur negative scoring without clamping or intermediate rounding", () => {
    const questions = Array.from({ length: 100 }, (_, index) => ({ id: `q${index}`, correctAnswer: "a", subject: "آزمون جامع", topic: index < 50 ? "بخش یک" : "بخش دو", weight: 1 }));
    const answers = questions.slice(0, 80).map((question, index) => ({ questionId: question.id, selectedOption: index < 60 ? "a" : "b" }));
    const result = new ExamScoringService().evaluate({ questions, scoring: { correct: 3, wrong: -1, unanswered: 0, negativeMarking: true } } as any, answers);
    expect(result).toMatchObject({ correct: 60, wrong: 20, unanswered: 20, rawScore: 160 });
    expect(result.percentage).toBeCloseTo(53.3333333333, 8);
  });

  it("allows a negative Konkur percentage", () => {
    const questions = Array.from({ length: 4 }, (_, index) => ({ id: `q${index}`, correctAnswer: "a", subject: "ریاضی", topic: "آزمون", weight: 1 }));
    const result = new ExamScoringService().evaluate({ questions, scoring: { correct: 3, wrong: -1, unanswered: 0, negativeMarking: true } } as any, questions.map((question) => ({ questionId: question.id, selectedOption: "b" })));
    expect(result.percentage).toBeCloseTo(-33.3333333333, 8);
  });
});
