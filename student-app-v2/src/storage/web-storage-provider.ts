import type { StorageProvider } from '@moshaver/student-core';

export class WebStorageProvider implements StorageProvider {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async save<T>(key: string, value: T): Promise<void> {
    this.storage.setItem(key, JSON.stringify(value));
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = this.storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async remove(key: string): Promise<void> {
    this.storage.removeItem(key);
  }

  async list(prefix: string): Promise<Array<{ key: string; value: unknown }>> {
    const items: Array<{ key: string; value: unknown }> = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      items.push({ key, value: JSON.parse(this.storage.getItem(key) ?? 'null') });
    }
    return items;
  }
}
