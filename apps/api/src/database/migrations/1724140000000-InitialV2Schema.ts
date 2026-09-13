import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialV2Schema1724140000000 implements MigrationInterface {
  name = "InitialV2Schema1724140000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS users (id varchar PRIMARY KEY NOT NULL, username varchar(120) NOT NULL, passwordHash varchar NOT NULL, role varchar(24) NOT NULL, createdAt datetime NOT NULL DEFAULT (datetime('now')), updatedAt datetime NOT NULL DEFAULT (datetime('now')))`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_users_username ON users (username)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS students (id varchar PRIMARY KEY NOT NULL, name varchar(160) NOT NULL, grade varchar NOT NULL DEFAULT (''), major varchar NOT NULL DEFAULT (''), targetUniversity varchar NOT NULL DEFAULT (''), targetField varchar NOT NULL DEFAULT (''), targetRank varchar NOT NULL DEFAULT (''), dailyCapacity varchar NOT NULL DEFAULT (''), createdAt datetime NOT NULL DEFAULT (datetime('now')), updatedAt datetime NOT NULL DEFAULT (datetime('now')), userId varchar, CONSTRAINT FK_students_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS sessions (id varchar PRIMARY KEY NOT NULL, tokenHash varchar NOT NULL, csrfToken varchar NOT NULL, expiresAt datetime NOT NULL, createdAt datetime NOT NULL DEFAULT (datetime('now')), userId varchar, CONSTRAINT FK_sessions_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_sessions_tokenHash ON sessions (tokenHash)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_sessions_expiresAt ON sessions (expiresAt)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS plans (id varchar PRIMARY KEY NOT NULL, date date NOT NULL, status varchar(24) NOT NULL DEFAULT ('DRAFT'), createdAt datetime NOT NULL DEFAULT (datetime('now')), studentId varchar, CONSTRAINT FK_plans_student FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_plans_student_date ON plans (studentId, date)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS tasks (id varchar PRIMARY KEY NOT NULL, type varchar(24) NOT NULL, title varchar(220) NOT NULL, description varchar NOT NULL DEFAULT (''), duration integer NOT NULL DEFAULT (0), priority integer NOT NULL DEFAULT (0), completedAt datetime, planId varchar, CONSTRAINT FK_tasks_plan FOREIGN KEY (planId) REFERENCES plans (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_tasks_plan ON tasks (planId)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS exams (id varchar PRIMARY KEY NOT NULL, title varchar(220) NOT NULL, subject varchar NOT NULL DEFAULT (''), duration integer NOT NULL DEFAULT (0), attemptLimit integer NOT NULL DEFAULT (1), startTime datetime, endTime datetime)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS questions (id varchar PRIMARY KEY NOT NULL, text varchar NOT NULL, options text NOT NULL, correctAnswer varchar NOT NULL, explanation varchar NOT NULL DEFAULT (''), examId varchar, CONSTRAINT FK_questions_exam FOREIGN KEY (examId) REFERENCES exams (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_questions_exam ON questions (examId)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS exam_attempts (id varchar PRIMARY KEY NOT NULL, score integer NOT NULL DEFAULT (0), startedAt datetime NOT NULL, finishedAt datetime, examId varchar, studentId varchar, CONSTRAINT FK_attempts_exam FOREIGN KEY (examId) REFERENCES exams (id) ON DELETE CASCADE, CONSTRAINT FK_attempts_student FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_attempts_exam ON exam_attempts (examId)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_attempts_student ON exam_attempts (studentId)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS mistakes (id varchar PRIMARY KEY NOT NULL, studentId varchar NOT NULL, questionId varchar NOT NULL, reason varchar NOT NULL DEFAULT (''), resolved boolean NOT NULL DEFAULT (0))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_mistakes_student ON mistakes (studentId)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS topic_mastery (id varchar PRIMARY KEY NOT NULL, studentId varchar NOT NULL, topic varchar NOT NULL, score integer NOT NULL DEFAULT (0))`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_topic_mastery_student_topic ON topic_mastery (studentId, topic)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS notifications (id varchar PRIMARY KEY NOT NULL, type varchar(40) NOT NULL, title varchar NOT NULL, message varchar NOT NULL, readAt datetime, studentId varchar, CONSTRAINT FK_notifications_student FOREIGN KEY (studentId) REFERENCES students (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_notifications_student ON notifications (studentId)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS chat_messages (id varchar PRIMARY KEY NOT NULL, receiverId varchar NOT NULL, type varchar(40) NOT NULL, content varchar NOT NULL, createdAt datetime NOT NULL DEFAULT (datetime('now')), senderId varchar, CONSTRAINT FK_chat_sender FOREIGN KEY (senderId) REFERENCES users (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_chat_sender ON chat_messages (senderId)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_chat_receiver ON chat_messages (receiverId)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS audit_logs (id varchar PRIMARY KEY NOT NULL, action varchar NOT NULL, entity varchar NOT NULL, metadata text, createdAt datetime NOT NULL DEFAULT (datetime('now')), userId varchar, CONSTRAINT FK_audit_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_audit_user ON audit_logs (userId)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["audit_logs", "chat_messages", "notifications", "topic_mastery", "mistakes", "exam_attempts", "questions", "exams", "tasks", "plans", "sessions", "students", "users"]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
