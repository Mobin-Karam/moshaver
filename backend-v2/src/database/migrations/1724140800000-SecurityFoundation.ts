import { MigrationInterface, QueryRunner } from "typeorm";
export class SecurityFoundation1724140800000 implements MigrationInterface {
  name = "SecurityFoundation1724140800000";
  async up(q: QueryRunner) { await q.query(`CREATE TABLE IF NOT EXISTS login_throttles (id varchar PRIMARY KEY NOT NULL, key varchar(200) NOT NULL, attempts integer NOT NULL DEFAULT 0, windowStartedAt datetime NOT NULL, lockedUntil datetime, updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP)`); await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_login_throttle_key ON login_throttles(key)`); await q.query(`CREATE INDEX IF NOT EXISTS IDX_login_throttle_lock ON login_throttles(lockedUntil)`); }
  async down(q: QueryRunner) { await q.query(`DROP TABLE IF EXISTS login_throttles`); }
}
