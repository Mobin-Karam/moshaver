import { MigrationInterface, QueryRunner } from "typeorm";

export class PlanningFields1724140100000 implements MigrationInterface {
  name = "PlanningFields1724140100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfMissing(queryRunner, "tasks", "subject", "varchar NOT NULL DEFAULT ('')");
    await addColumnIfMissing(queryRunner, "tasks", "startTime", "varchar NOT NULL DEFAULT ('')");
    await addColumnIfMissing(queryRunner, "tasks", "endTime", "varchar NOT NULL DEFAULT ('')");
    await addColumnIfMissing(queryRunner, "tasks", "testCount", "integer NOT NULL DEFAULT (0)");
    await addColumnIfMissing(queryRunner, "tasks", "note", "varchar NOT NULL DEFAULT ('')");
    await addColumnIfMissing(queryRunner, "tasks", "status", "varchar(24) NOT NULL DEFAULT ('PLANNED')");
  }

  async down(): Promise<void> {
    // SQLite cannot drop columns safely without rebuilding the table. Keep this additive migration irreversible.
  }
}

async function addColumnIfMissing(queryRunner: QueryRunner, tableName: string, columnName: string, definition: string) {
  const columns = (await queryRunner.query(`PRAGMA table_info(${tableName})`)) as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    await queryRunner.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}
