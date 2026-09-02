import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncMutations1724140400000 implements MigrationInterface {
  name = "SyncMutations1724140400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS sync_mutations (id varchar PRIMARY KEY NOT NULL, userId varchar NOT NULL, mutationId varchar(160) NOT NULL, method varchar(20) NOT NULL, path varchar(240) NOT NULL, result text NOT NULL, createdAt datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT FK_sync_mutations_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_sync_mutations_user_mutation ON sync_mutations (userId, mutationId)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sync_mutations`);
  }
}