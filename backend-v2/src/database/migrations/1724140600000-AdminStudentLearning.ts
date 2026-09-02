import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class AdminStudentLearning1724140600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn("students", new TableColumn({ name: "accountStatus", type: "varchar", length: "24", default: "'active'" }));
    await queryRunner.createTable(new Table({
      name: "learning_items",
      columns: [
        { name: "id", type: "varchar", isPrimary: true }, { name: "studentId", type: "varchar" },
        { name: "subject", type: "varchar", default: "''" }, { name: "book", type: "varchar", default: "''" },
        { name: "chapter", type: "varchar", default: "''" }, { name: "lesson", type: "varchar", default: "''" },
        { name: "topic", type: "varchar", default: "''" }, { name: "title", type: "varchar", length: "2000" },
        { name: "note", type: "text", default: "''" }, { name: "hint", type: "text", default: "''" },
        { name: "dueDate", type: "date" }, { name: "intervalDays", type: "integer", default: 1 },
        { name: "reviewCount", type: "integer", default: 0 }, { name: "mastery", type: "float", default: 0 },
        { name: "status", type: "varchar", length: "24", default: "'pending'" },
        { name: "completedAt", type: "datetime", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
        { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
      ],
    }));
    await queryRunner.createForeignKey("learning_items", new TableForeignKey({ columnNames: ["studentId"], referencedTableName: "students", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("learning_items", new TableIndex({ name: "IDX_learning_student_due", columnNames: ["studentId", "dueDate"] }));
    await queryRunner.createTable(new Table({
      name: "learning_reviews",
      columns: [
        { name: "id", type: "varchar", isPrimary: true }, { name: "itemId", type: "varchar" },
        { name: "rating", type: "float", default: 0 }, { name: "previousMastery", type: "float", default: 0 },
        { name: "newMastery", type: "float", default: 0 }, { name: "previousIntervalDays", type: "integer", default: 1 },
        { name: "nextIntervalDays", type: "integer", default: 1 }, { name: "nextReviewAt", type: "date" },
        { name: "reviewedAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
      ],
    }));
    await queryRunner.createForeignKey("learning_reviews", new TableForeignKey({ columnNames: ["itemId"], referencedTableName: "learning_items", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("learning_reviews");
    await queryRunner.dropTable("learning_items");
    await queryRunner.dropColumn("students", "accountStatus");
  }
}
