import { MigrationInterface, QueryRunner } from "typeorm";

export class SignupThrottle1724143400000 implements MigrationInterface {
  name = "SignupThrottle1724143400000";
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE signup_throttles (id varchar PRIMARY KEY NOT NULL, key varchar(80) NOT NULL, attempts integer NOT NULL DEFAULT (0), windowStartedAt datetime NOT NULL, updatedAt datetime NOT NULL DEFAULT (datetime('now')))`);
    await q.query(`CREATE UNIQUE INDEX IDX_signup_throttle_key ON signup_throttles(key)`);
  }
  async down(q: QueryRunner) {
    await q.query(`DROP INDEX IDX_signup_throttle_key`);
    await q.query(`DROP TABLE signup_throttles`);
  }
}
