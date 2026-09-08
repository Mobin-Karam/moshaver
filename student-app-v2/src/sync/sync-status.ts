import type { SyncProvider, SyncQueueItem, SyncStatus } from '@moshaver/student-core';

const WEB_QUEUE_KEY = 'moshaver_v2_sync_queue';
const WEB_CURSOR_KEY = 'moshaver_v2_sync_cursor';

export class WebSyncProvider implements SyncProvider {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async enqueue<T>(item: SyncQueueItem<T>): Promise<void> {
    const items = await this.pending();
    const next = [...items.filter((current) => current.id !== item.id), item];
    this.storage.setItem(WEB_QUEUE_KEY, JSON.stringify(next));
  }

  async pending(): Promise<SyncQueueItem[]> {
    try {
      return JSON.parse(this.storage.getItem(WEB_QUEUE_KEY) ?? '[]') as SyncQueueItem[];
    } catch {
      return [];
    }
  }

  async remove(id: string): Promise<void> {
    const items = await this.pending();
    this.storage.setItem(WEB_QUEUE_KEY, JSON.stringify(items.filter((item) => item.id !== id)));
  }
  async getCursor() { return this.storage.getItem(WEB_CURSOR_KEY); }
  async setCursor(cursor: string) { this.storage.setItem(WEB_CURSOR_KEY, cursor); }
}

export function statusFromOnlineState(online: boolean): SyncStatus {
  return online ? 'online' : 'offline';
}
