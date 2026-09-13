import type { StorageProvider } from '@moshaver/student-core';
import Database from '@tauri-apps/plugin-sql';

export class TauriSQLiteProvider implements StorageProvider {
  private dbPromise: Promise<Database> | null = null;

  constructor(private readonly url = 'sqlite:moshaver-student.db') {}

  async save<T>(key: string, value: T): Promise<void> {
    const db = await this.db();
    await db.execute(
      'insert into settings (key, value, updated_at) values ($1, $2, $3) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at',
      [key, JSON.stringify(value), new Date().toISOString()],
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const db = await this.db();
    const rows = await db.select<Array<{ value: string }>>('select value from settings where key = $1 limit 1', [key]);
    return rows[0]?.value ? (JSON.parse(rows[0].value) as T) : null;
  }

  async remove(key: string): Promise<void> {
    const db = await this.db();
    await db.execute('delete from settings where key = $1', [key]);
  }

  async list(prefix: string): Promise<Array<{ key: string; value: unknown }>> {
    const db = await this.db();
    const rows = await db.select<Array<{ key: string; value: string }>>(
      'select key, value from settings where key like $1 order by key asc',
      [`${prefix}%`],
    );
    return rows.map((row) => ({ key: row.key, value: JSON.parse(row.value) }));
  }

  async raw(): Promise<Database> {
    return this.db();
  }

  private async db(): Promise<Database> {
    if (!this.dbPromise) {
      this.dbPromise = Database.load(this.url).then(async (db) => {
        await initializeStudentSchema(db);
        return db;
      });
    }
    return this.dbPromise;
  }
}

export async function initializeStudentSchema(db: Database): Promise<void> {
  await db.execute('create table if not exists local_tasks (id text primary key, payload text not null, updated_at text not null)');
  await db.execute('create table if not exists local_plans (id text primary key, plan_date text not null, payload text not null, updated_at text not null)');
  await db.execute('create table if not exists local_exams (id text primary key, payload text not null, updated_at text not null)');
  await db.execute('create table if not exists local_questions (id text primary key, exam_id text, payload text not null, updated_at text not null)');
  await db.execute('create table if not exists local_answers (id text primary key, question_id text not null, payload text not null, sync_state text not null, updated_at text not null)');
  await db.execute('create table if not exists local_messages (id text primary key, conversation_id text not null, payload text not null, sync_state text not null, updated_at text not null)');
  await db.execute('create table if not exists sync_queue (id text primary key, method text not null, path text not null, body text not null, conflict_policy text not null, created_at text not null)');
  await db.execute('create table if not exists settings (key text primary key, value text not null, updated_at text not null)');
}
