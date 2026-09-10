import { Injectable } from "@nestjs/common";
import { Exam } from "../../database/entities/exam.entity";
import { Question } from "../../database/entities/question.entity";

type SelectedAnswer = { questionId: string; selectedOption?: string | null };
type Row = { correct: number; wrong: number; unanswered: number; total: number; rawScore: number; maximum: number };

@Injectable()
export class ExamScoringService {
  evaluate(exam: Exam, answers: SelectedAnswer[]) {
    const selected = new Map(answers.map((answer) => [answer.questionId, answer.selectedOption || null]));
    const scoring = exam.scoring || { correct: 1, wrong: 0, unanswered: 0, negativeMarking: false };
    const total = this.row();
    const subjects = new Map<string, Row>();
    const topics = new Map<string, Row>();
    for (const question of exam.questions || []) {
      const answer = selected.get(question.id);
      const subject = question.subject || exam.subject || "عمومی";
      const topic = question.topic || "سایر";
      this.add(total, question, answer, scoring);
      const subjectRow = subjects.get(subject) || this.row(); this.add(subjectRow, question, answer, scoring); subjects.set(subject, subjectRow);
      const topicKey = `${subject}\u0000${topic}`; const topicRow = topics.get(topicKey) || this.row(); this.add(topicRow, question, answer, scoring); topics.set(topicKey, topicRow);
    }
    return {
      ...total,
      percentage: total.maximum ? total.rawScore / total.maximum * 100 : 0,
      subjects: [...subjects].map(([subject, row]) => ({ subject, ...row, percentage: row.maximum ? row.rawScore / row.maximum * 100 : 0 })),
      topics: [...topics].map(([key, row]) => { const [subject, topic] = key.split("\u0000"); return { subject, topic, ...row, percentage: row.maximum ? row.rawScore / row.maximum * 100 : 0 }; }),
    };
  }

  private row(): Row { return { correct: 0, wrong: 0, unanswered: 0, total: 0, rawScore: 0, maximum: 0 }; }
  private add(row: Row, question: Question, answer: string | null | undefined, scoring: Exam["scoring"]) {
    const weight = Number.isFinite(question.weight) && question.weight > 0 ? question.weight : 1;
    row.total += 1; row.maximum += Math.max(0, scoring.correct) * weight;
    if (!answer) { row.unanswered += 1; row.rawScore += scoring.unanswered * weight; }
    else if (answer === question.correctAnswer) { row.correct += 1; row.rawScore += scoring.correct * weight; }
    else { row.wrong += 1; row.rawScore += scoring.wrong * weight; }
  }
}
