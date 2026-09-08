import { MigrationInterface, QueryRunner } from "typeorm";

const roles: Array<[string, string, number]> = [
  ["STUDENT", "Student", 0], ["GUARDIAN", "Guardian", 1], ["ADVISOR", "Advisor", 1],
  ["TEACHER", "Teacher", 1], ["MENTOR", "Mentor", 1], ["CONTENT_MANAGER", "Content manager", 1],
  ["ORGANIZATION_ADMIN", "Organization administrator", 1], ["PLATFORM_ADMIN", "Platform administrator", 0],
];

const roleCapabilities: Record<string, string[]> = {
  STUDENT: ["student.profile.read", "plans.read", "tasks.read", "tasks.update", "subjects.read", "learning.read", "learning.create", "learning.update", "learning.review", "exams.read", "chat.read", "chat.send"],
  GUARDIAN: ["students.read", "student.profile.read", "student.progress.read", "plans.read", "exams.read", "reports.read", "chat.read", "chat.send"],
  ADVISOR: ["students.read", "student.profile.read", "student.progress.read", "student.analytics.read", "plans.read", "plans.create", "plans.update", "plans.publish", "tasks.read", "tasks.update", "reports.read", "reports.manage", "chat.read", "chat.send"],
  TEACHER: ["students.read", "student.progress.read", "subjects.read", "questions.read", "questions.create", "questions.update", "exams.read", "exams.create", "exams.update", "exams.assign", "exams.results.read", "chat.read", "chat.send"],
  MENTOR: ["students.read", "student.progress.read", "plans.read", "reports.read", "chat.read", "chat.send"],
  CONTENT_MANAGER: ["subjects.read", "subjects.manage", "questions.read", "questions.create", "questions.update", "questions.delete", "exams.read", "exams.create", "exams.update"],
  ORGANIZATION_ADMIN: ["organization.read", "organization.manage", "organization.members.manage", "users.read", "users.manage", "students.read", "students.create", "students.update", "students.archive", "reports.read"],
  PLATFORM_ADMIN: ["organization.read", "organization.manage", "organization.members.manage", "users.read", "users.manage", "students.read", "students.create", "students.update", "students.archive", "audit.read", "system.manage", "database.backup", "database.restore"],
};

export class IdentityAuthorization1724140700000 implements MigrationInterface {
  name = "IdentityAuthorization1724140700000";

  async up(q: QueryRunner): Promise<void> {
    for (const sql of [
      `ALTER TABLE users ADD COLUMN firstName varchar(100) NOT NULL DEFAULT ''`,
      `ALTER TABLE users ADD COLUMN lastName varchar(100) NOT NULL DEFAULT ''`,
      `ALTER TABLE users ADD COLUMN status varchar(20) NOT NULL DEFAULT 'ACTIVE'`,
      `ALTER TABLE users ADD COLUMN locale varchar(12) NOT NULL DEFAULT 'fa-IR'`,
      `ALTER TABLE users ADD COLUMN timezone varchar(64) NOT NULL DEFAULT 'Asia/Tehran'`,
    ]) { try { await q.query(sql); } catch (error) { if (!String(error).includes("duplicate column")) throw error; } }

    await q.query(`CREATE TABLE IF NOT EXISTS roles (id varchar PRIMARY KEY NOT NULL, code varchar(48) NOT NULL, name varchar(120) NOT NULL, organizationScoped boolean NOT NULL DEFAULT 0)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_roles_code ON roles(code)`);
    await q.query(`CREATE TABLE IF NOT EXISTS permissions (id varchar PRIMARY KEY NOT NULL, code varchar(100) NOT NULL, description varchar(180) NOT NULL DEFAULT '')`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_permissions_code ON permissions(code)`);
    await q.query(`CREATE TABLE IF NOT EXISTS role_permissions (id varchar PRIMARY KEY NOT NULL, roleId varchar NOT NULL, permissionId varchar NOT NULL, CONSTRAINT FK_rp_role FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE CASCADE, CONSTRAINT FK_rp_permission FOREIGN KEY(permissionId) REFERENCES permissions(id) ON DELETE CASCADE)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_role_permissions_pair ON role_permissions(roleId, permissionId)`);
    await q.query(`CREATE TABLE IF NOT EXISTS organizations (id varchar PRIMARY KEY NOT NULL, name varchar(180) NOT NULL, type varchar(32) NOT NULL, status varchar(20) NOT NULL DEFAULT 'ACTIVE', createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await q.query(`CREATE INDEX IF NOT EXISTS IDX_organizations_name ON organizations(name)`);
    await q.query(`CREATE TABLE IF NOT EXISTS organization_memberships (id varchar PRIMARY KEY NOT NULL, organizationId varchar NOT NULL, userId varchar NOT NULL, status varchar(20) NOT NULL DEFAULT 'ACTIVE', joinedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT FK_membership_org FOREIGN KEY(organizationId) REFERENCES organizations(id) ON DELETE CASCADE, CONSTRAINT FK_membership_user FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_membership_pair ON organization_memberships(organizationId, userId)`);
    await q.query(`CREATE INDEX IF NOT EXISTS IDX_membership_user_status ON organization_memberships(userId, status)`);
    await q.query(`CREATE TABLE IF NOT EXISTS user_role_assignments (id varchar PRIMARY KEY NOT NULL, userId varchar NOT NULL, roleId varchar NOT NULL, membershipId varchar, createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT FK_assignment_user FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT FK_assignment_role FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE RESTRICT, CONSTRAINT FK_assignment_membership FOREIGN KEY(membershipId) REFERENCES organization_memberships(id) ON DELETE CASCADE)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_assignment_scope ON user_role_assignments(userId, roleId, membershipId)`);
    await q.query(`CREATE INDEX IF NOT EXISTS IDX_assignment_user ON user_role_assignments(userId)`);
    await q.query(`CREATE TABLE IF NOT EXISTS user_relationships (id varchar PRIMARY KEY NOT NULL, fromUserId varchar NOT NULL, toStudentId varchar NOT NULL, organizationId varchar, type varchar(24) NOT NULL, status varchar(20) NOT NULL DEFAULT 'PENDING', createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, acceptedAt datetime, revokedAt datetime, CONSTRAINT FK_relationship_user FOREIGN KEY(fromUserId) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT FK_relationship_student FOREIGN KEY(toStudentId) REFERENCES students(id) ON DELETE CASCADE, CONSTRAINT FK_relationship_org FOREIGN KEY(organizationId) REFERENCES organizations(id) ON DELETE CASCADE)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS IDX_relationship_scope ON user_relationships(fromUserId, toStudentId, organizationId, type)`);
    await q.query(`CREATE INDEX IF NOT EXISTS IDX_relationship_target_status ON user_relationships(toStudentId, status, type)`);
    await q.query(`CREATE INDEX IF NOT EXISTS IDX_relationship_source_status ON user_relationships(fromUserId, status, type)`);

    for (const [code, name, scoped] of roles) {
      await q.query(`INSERT OR IGNORE INTO roles(id, code, name, organizationScoped) VALUES(lower(hex(randomblob(16))), ?, ?, ?)`, [code, name, scoped]);
    }
    const capabilities = [...new Set(Object.values(roleCapabilities).flat())];
    for (const code of capabilities) await q.query(`INSERT OR IGNORE INTO permissions(id, code, description) VALUES(lower(hex(randomblob(16))), ?, '')`, [code]);
    for (const [role, capabilitiesForRole] of Object.entries(roleCapabilities)) {
      for (const capability of capabilitiesForRole) await q.query(`INSERT OR IGNORE INTO role_permissions(id, roleId, permissionId) SELECT lower(hex(randomblob(16))), r.id, p.id FROM roles r, permissions p WHERE r.code=? AND p.code=?`, [role, capability]);
    }
    await q.query(`INSERT OR IGNORE INTO user_role_assignments(id, userId, roleId, membershipId) SELECT lower(hex(randomblob(16))), u.id, r.id, NULL FROM users u JOIN roles r ON r.code = CASE WHEN u.role='ADMIN' THEN 'PLATFORM_ADMIN' ELSE u.role END`);
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of ["user_relationships", "user_role_assignments", "organization_memberships", "organizations", "role_permissions", "permissions", "roles"]) await q.query(`DROP TABLE IF EXISTS ${table}`);
  }
}
