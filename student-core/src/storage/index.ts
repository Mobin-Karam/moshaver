import type { StorageProvider } from '../providers/index.js';

export class MemoryStorageProvider implements StorageProvider {
  private readonly values = new Map<string, unknown>();

  async save<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.values.has(key) ? this.values.get(key) : null) as T | null;
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(prefix: string): Promise<Array<{ key: string; value: unknown }>> {
    return [...this.values.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, value }));
  }
}
