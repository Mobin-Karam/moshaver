import { MigrationInterface, QueryRunner } from "typeorm";

export class KonkurExamDomain1724143900000 implements MigrationInterface {
  name = "KonkurExamDomain1724143900000";

  async up(queryRunner: QueryRunner) {
    for (const sql of [
      `ALTER TABLE exams ADD COLUMN description varchar NOT NULL DEFAULT ('')`,
      `ALTER TABLE exams ADD COLUMN lifecycleStatus varchar NOT NULL DEFAULT ('scheduled')`,
      `ALTER TABLE exams ADD COLUMN navigationMode varchar NOT NULL DEFAULT ('free')`,
      `ALTER TABLE exams ADD COLUMN timerMode varchar NOT NULL DEFAULT ('whole_exam')`,
      `ALTER TABLE exams ADD COLUMN allowResume boolean NOT NULL DEFAULT (1)`,
      `ALTER TABLE exams ADD COLUMN allowLateStart boolean NOT NULL DEFAULT (0)`,
      `ALTER TABLE exams ADD COLUMN allowPracticeAfterDeadline boolean NOT NULL DEFAULT (0)`,
      `ALTER TABLE exams ADD COLUMN autoSubmitOnTimeout boolean NOT NULL DEFAULT (1)`,
      `ALTER TABLE exams ADD COLUMN sessionPolicy varchar NOT NULL DEFAULT ('allow_resume')`,
      `ALTER TABLE exams ADD COLUMN integrityMonitoring boolean NOT NULL DEFAULT (0)`,
      `ALTER TABLE exams ADD COLUMN answerKeyReleaseAt datetime`,
      `ALTER TABLE exams ADD COLUMN explanationReleaseAt datetime`,
      `ALTER TABLE exams ADD COLUMN rankingReleaseAt datetime`,
      `ALTER TABLE exams ADD COLUMN latestStartAt datetime`,
      `ALTER TABLE exam_attempts ADD COLUMN status varchar NOT NULL DEFAULT ('active')`,
      `ALTER TABLE exam_attempts ADD COLUMN expiresAt datetime`,
      `ALTER TABLE exam_attempts ADD COLUMN submittedAt datetime`,
      `ALTER TABLE exam_attempts ADD COLUMN lastHeartbeatAt datetime`,
      `ALTER TABLE exam_attempts ADD COLUMN currentSectionId varchar NOT NULL DEFAULT ('')`,
      `ALTER TABLE exam_attempts ADD COLUMN rawScore float`,
      `ALTER TABLE exam_attempts ADD COLUMN percentage float`,
      `ALTER TABLE exam_attempts ADD COLUMN correctCount integer`,
      `ALTER TABLE exam_attempts ADD COLUMN incorrectCount integer`,
      `ALTER TABLE exam_attempts ADD COLUMN unansweredCount integer`,
      `ALTER TABLE questions ADD COLUMN book varchar NOT NULL DEFAULT ('')`,
      `ALTER TABLE questions ADD COLUMN grade varchar NOT NULL DEFAULT ('')`,
      `ALTER TABLE questions ADD COLUMN chapter varchar NOT NULL DEFAULT ('')`,
      `ALTER TABLE questions ADD COLUMN lesson varchar NOT NULL DEFAULT ('')`,
      `ALTER TABLE questions ADD COLUMN subtopic varchar NOT NULL DEFAULT ('')`,
      `ALTER TABLE questions ADD COLUMN questionType varchar NOT NULL DEFAULT ('multiple_choice')`,
      `ALTER TABLE questions ADD COLUMN weight float NOT NULL DEFAULT (1)`,
    ]) await queryRunner.query(sql);
    await queryRunner.query(`UPDATE exam_attempts SET submittedAt = finishedAt, status = 'submitted' WHERE finishedAt IS NOT NULL`);
    await queryRunner.query(`UPDATE exams SET mode = 'mock' WHERE mode = 'standard'`);
  }

  async down(queryRunner: QueryRunner) {
    for (const column of ["weight", "questionType", "subtopic", "lesson", "chapter", "grade", "book"]) await queryRunner.query(`ALTER TABLE questions DROP COLUMN ${column}`);
    for (const column of ["unansweredCount", "incorrectCount", "correctCount", "percentage", "rawScore", "currentSectionId", "lastHeartbeatAt", "submittedAt", "expiresAt", "status"]) await queryRunner.query(`ALTER TABLE exam_attempts DROP COLUMN ${column}`);
    for (const column of ["latestStartAt", "rankingReleaseAt", "explanationReleaseAt", "answerKeyReleaseAt", "integrityMonitoring", "sessionPolicy", "autoSubmitOnTimeout", "allowPracticeAfterDeadline", "allowLateStart", "allowResume", "timerMode", "navigationMode", "lifecycleStatus", "description"]) await queryRunner.query(`ALTER TABLE exams DROP COLUMN ${column}`);
  }
}
