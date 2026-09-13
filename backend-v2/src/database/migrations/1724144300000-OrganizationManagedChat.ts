import type { MigrationInterface, QueryRunner } from "typeorm";

export class OrganizationManagedChat1724144300000 implements MigrationInterface {
  name = "OrganizationManagedChat1724144300000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE conversations ADD COLUMN organizationId varchar`);
    await queryRunner.query(`ALTER TABLE conversations ADD COLUMN autoManaged boolean NOT NULL DEFAULT (0)`);
    await queryRunner.query(`CREATE INDEX IDX_conversation_organization ON conversations(organizationId)`);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_organization_managed_chat ON conversations(organizationId) WHERE autoManaged = 1`);
    await queryRunner.query(`CREATE TRIGGER FK_organization_chat_cleanup AFTER DELETE ON organizations BEGIN DELETE FROM conversations WHERE organizationId = OLD.id AND autoManaged = 1; END`);
    await queryRunner.query(`INSERT INTO conversations(id,type,title,description,permissions,autoManaged,organizationId)
      SELECT lower(hex(randomblob(16))),'GROUP',name || ' · گروه سازمان','گروه رسمی اعضای سازمان','{"members_can_send_messages":true,"members_can_react":true,"members_can_use_mentions":true}',1,id
      FROM organizations WHERE status = 'ACTIVE'`);
    await queryRunner.query(`INSERT INTO conversation_members(id,role,muted,joinedAt,conversationId,userId)
      SELECT lower(hex(randomblob(16))),'MEMBER',0,datetime('now'),conversation.id,membership.userId
      FROM organization_memberships membership
      JOIN conversations conversation ON conversation.organizationId = membership.organizationId AND conversation.autoManaged = 1
      WHERE membership.status = 'ACTIVE'`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX UQ_organization_managed_chat`);
    await queryRunner.query(`DROP TRIGGER FK_organization_chat_cleanup`);
    await queryRunner.query(`DROP INDEX IDX_conversation_organization`);
    await queryRunner.query(`ALTER TABLE conversations DROP COLUMN autoManaged`);
    await queryRunner.query(`ALTER TABLE conversations DROP COLUMN organizationId`);
  }
}
