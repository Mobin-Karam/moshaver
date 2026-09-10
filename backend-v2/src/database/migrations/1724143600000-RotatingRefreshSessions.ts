import { MigrationInterface, QueryRunner } from "typeorm";

export class RotatingRefreshSessions1724143600000 implements MigrationInterface {
  name = "RotatingRefreshSessions1724143600000";

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE sessions ADD COLUMN refreshTokenHash varchar`);
    await queryRunner.query(`ALTER TABLE sessions ADD COLUMN refreshExpiresAt datetime`);
    await queryRunner.query(`CREATE UNIQUE INDEX IDX_sessions_refresh_token ON sessions(refreshTokenHash)`);
    await queryRunner.query(`CREATE INDEX IDX_sessions_refresh_expiry ON sessions(refreshExpiresAt)`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`DROP INDEX IDX_sessions_refresh_expiry`);
    await queryRunner.query(`DROP INDEX IDX_sessions_refresh_token`);
    await queryRunner.query(`ALTER TABLE sessions DROP COLUMN refreshExpiresAt`);
    await queryRunner.query(`ALTER TABLE sessions DROP COLUMN refreshTokenHash`);
  }
}
