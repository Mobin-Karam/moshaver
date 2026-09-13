import { MigrationInterface, QueryRunner } from "typeorm";
export class UserNotifications1724141200000 implements MigrationInterface {
  name="UserNotifications1724141200000";
  async up(q:QueryRunner){
    await q.query(`CREATE TABLE "notifications_new" ("id" varchar PRIMARY KEY NOT NULL,"type" varchar(40) NOT NULL,"category" varchar NOT NULL DEFAULT ('general'),"title" varchar NOT NULL,"body" varchar NOT NULL,"url" varchar,"data" text,"priority" varchar NOT NULL DEFAULT ('normal'),"readAt" datetime,"createdAt" datetime NOT NULL DEFAULT (datetime('now')),"expiresAt" datetime,"dedupeKey" varchar,"userId" varchar NOT NULL,"organizationId" varchar,CONSTRAINT "FK_notification_user" FOREIGN KEY("userId") REFERENCES "users"("id") ON DELETE CASCADE,CONSTRAINT "FK_notification_org" FOREIGN KEY("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE)`);
    await q.query(`INSERT INTO notifications_new(id,type,title,body,readAt,createdAt,userId) SELECT n.id,n.type,n.title,n.message,n.readAt,n.createdAt,s.userId FROM notifications n JOIN students s ON s.id=n.studentId WHERE s.userId IS NOT NULL`);
    await q.query(`DROP TABLE notifications`); await q.query(`ALTER TABLE notifications_new RENAME TO notifications`);
    await q.query(`CREATE INDEX IDX_notifications_user_created ON notifications(userId,createdAt,id)`); await q.query(`CREATE INDEX IDX_notifications_user_read_created ON notifications(userId,readAt,createdAt)`);
    await q.query(`CREATE UNIQUE INDEX IDX_notifications_user_dedupe ON notifications(userId,dedupeKey) WHERE dedupeKey IS NOT NULL`);
  }
  async down():Promise<void>{ throw new Error("User notification ownership migration is intentionally irreversible because reverting would discard non-student notifications."); }
}
