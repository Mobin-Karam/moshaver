import type { SyncProvider, SyncQueueItem } from '@moshaver/student-core';
import type Database from '@tauri-apps/plugin-sql';

export class SQLiteSyncProvider implements SyncProvider {
  constructor(private readonly db: Database) {}

  async enqueue<T>(item: SyncQueueItem<T>): Promise<void> {
    await this.db.execute(
      'insert into sync_queue (id, method, path, body, conflict_policy, created_at) values ($1, $2, $3, $4, $5, $6) on conflict(id) do update set method = excluded.method, path = excluded.path, body = excluded.body, conflict_policy = excluded.conflict_policy, created_at = excluded.created_at',
      [item.id, item.method, item.path, JSON.stringify(item.body), item.conflictPolicy, item.createdAt],
    );
  }

  async pending(): Promise<SyncQueueItem[]> {
    const rows = await this.db.select<
      Array<{
        id: string;
        method: SyncQueueItem['method'];
        path: string;
        body: string;
        conflict_policy: SyncQueueItem['conflictPolicy'];
        created_at: string;
      }>
    >('select id, method, path, body, conflict_policy, created_at from sync_queue order by created_at asc');

    return rows.map((row) => ({
      id: row.id,
      method: row.method,
      path: row.path,
      body: JSON.parse(row.body) as unknown,
      conflictPolicy: row.conflict_policy,
      createdAt: row.created_at,
    }));
  }

  async remove(id: string): Promise<void> {
    await this.db.execute('delete from sync_queue where id = $1', [id]);
  }
}
