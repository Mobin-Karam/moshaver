import type { SyncStatus } from '@moshaver/student-core';

export function statusFromOnlineState(online: boolean): SyncStatus {
  return online ? 'online' : 'offline';
}
