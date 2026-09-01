import { MigrationInterface, QueryRunner } from "typeorm";

export class StudySessions1724140200000 implements MigrationInterface {
  name = "StudySessions1724140200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS study_sessions (id varchar PRIMARY KEY NOT NULL, status varchar(24) NOT NULL DEFAULT ('ACTIVE'), startedAt datetime NOT NULL, lastStartedAt datetime, lastHeartbeatAt datetime, pausedAt datetime, finishedAt datetime, elapsedSeconds integer NOT NULL DEFAULT (0), actualTests integer NOT NULL DEFAULT (0), difficulty varchar NOT NULL DEFAULT (''), note varchar NOT NULL DEFAULT (''), createdAt datetime NOT NULL DEFAULT (datetime('now')), updatedAt datetime NOT NULL DEFAULT (datetime('now')), studentId varchar, taskId varchar, CONSTRAINT FK_study_sessions_student FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE, CONSTRAINT FK_study_sessions_task FOREIGN KEY (taskId) REFERENCES tasks (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_study_sessions_student_status ON study_sessions (studentId, status)`);
  }

  async down(): Promise<void> {
    // Keep the additive migration irreversible for SQLite compatibility.
  }
}