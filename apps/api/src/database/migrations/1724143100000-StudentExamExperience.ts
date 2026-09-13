import { MigrationInterface, QueryRunner } from "typeorm";

export class StudentExamExperience1724143100000 implements MigrationInterface {
  name = "StudentExamExperience1724143100000";

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE exams ADD COLUMN mode varchar NOT NULL DEFAULT ('standard')`);
    await queryRunner.query(`ALTER TABLE exams ADD COLUMN instructions text NOT NULL DEFAULT ('[]')`);
    await queryRunner.query(`ALTER TABLE exams ADD COLUMN allowBackNavigation boolean NOT NULL DEFAULT (1)`);
    await queryRunner.query(`ALTER TABLE exams ADD COLUMN scoring text NOT NULL DEFAULT ('{"correct":1,"wrong":0,"unanswered":0,"negativeMarking":false}')`);
    await queryRunner.query(`ALTER TABLE exams ADD COLUMN resultPolicy varchar NOT NULL DEFAULT ('immediate')`);
    await queryRunner.query(`ALTER TABLE exams ADD COLUMN resultReleaseAt datetime`);
    await queryRunner.query(`ALTER TABLE exams ADD COLUMN resultsReleased boolean NOT NULL DEFAULT (1)`);
    await queryRunner.query(`ALTER TABLE exams ADD COLUMN sections text NOT NULL DEFAULT ('[]')`);
    await queryRunner.query(`ALTER TABLE questions ADD COLUMN subject varchar NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE questions ADD COLUMN topic varchar NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE questions ADD COLUMN sectionId varchar NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE questions ADD COLUMN mediaUrl varchar NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE questions ADD COLUMN difficulty varchar NOT NULL DEFAULT ('medium')`);
    await queryRunner.query(`ALTER TABLE questions ADD COLUMN source varchar NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE questions ADD COLUMN tags text NOT NULL DEFAULT ('[]')`);
  }

  async down(queryRunner: QueryRunner) {
    for (const column of ["tags", "source", "difficulty", "mediaUrl", "sectionId", "topic", "subject"])
      await queryRunner.query(`ALTER TABLE questions DROP COLUMN ${column}`);
    for (const column of ["sections", "resultsReleased", "resultReleaseAt", "resultPolicy", "scoring", "allowBackNavigation", "instructions", "mode"])
      await queryRunner.query(`ALTER TABLE exams DROP COLUMN ${column}`);
  }
}
