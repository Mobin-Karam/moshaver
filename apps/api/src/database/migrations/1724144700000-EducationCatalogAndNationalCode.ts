import { MigrationInterface, QueryRunner } from "typeorm";

export class EducationCatalogAndNationalCode1724144700000 implements MigrationInterface {
  name = "EducationCatalogAndNationalCode1724144700000";

  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE students ADD COLUMN nationalCode varchar(10)`);
    await q.query(`ALTER TABLE students ADD COLUMN gradeId integer`);
    await q.query(`ALTER TABLE students ADD COLUMN educationTypeId varchar(40) NOT NULL DEFAULT ('general')`);
    await q.query(`ALTER TABLE students ADD COLUMN trackId varchar(80) NOT NULL DEFAULT ('general')`);
    await q.query(`CREATE UNIQUE INDEX IDX_students_national_code ON students(nationalCode) WHERE nationalCode IS NOT NULL`);
    await q.query(`CREATE TABLE education_books (id varchar(120) PRIMARY KEY NOT NULL, country varchar(12) NOT NULL, schoolYear varchar(16) NOT NULL, grade integer NOT NULL, level varchar(80) NOT NULL, branch varchar(120) NOT NULL, track varchar(160) NOT NULL, category varchar(160) NOT NULL, titleFa varchar(240) NOT NULL, titleEn varchar(240) NOT NULL, textbookCode varchar(80), appliesTo text NOT NULL, notes text)`);
    await q.query(`CREATE INDEX IDX_education_books_year_grade ON education_books(schoolYear,grade)`);
  }

  async down(q: QueryRunner) {
    await q.query(`DROP INDEX IDX_education_books_year_grade`);
    await q.query(`DROP TABLE education_books`);
    await q.query(`DROP INDEX IDX_students_national_code`);
    await q.query(`ALTER TABLE students DROP COLUMN trackId`);
    await q.query(`ALTER TABLE students DROP COLUMN educationTypeId`);
    await q.query(`ALTER TABLE students DROP COLUMN gradeId`);
    await q.query(`ALTER TABLE students DROP COLUMN nationalCode`);
  }
}
