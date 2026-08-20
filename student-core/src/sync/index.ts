import type {
  NetworkProvider,
  SyncProvider,
  SyncQueueItem,
} from "../providers/index.js";

export type SyncStatus = "online" | "offline" | "syncing" | "failed";

export function conflictPolicyForPath(
  path: string,
): SyncQueueItem["conflictPolicy"] {
  if (path.startsWith("/plans") || path.startsWith("/dashboard")) {
    return "server-wins";
  }
  if (
    path.includes("/completion") ||
    path.startsWith("/task-issues") ||
    path.startsWith("/recovery-requests") ||
    path.startsWith("/reports") ||
    path.includes("/messages")
  ) {
    return "student-wins";
  }
  if (path.includes("/quizzes/") || path.includes("/exams/")) {
    return "manual";
  }
  return "server-wins";
}

export async function enqueueMutation<T>(
  sync: SyncProvider,
  item: Omit<SyncQueueItem<T>, "id" | "createdAt" | "conflictPolicy"> & {
    id?: string;
    createdAt?: string;
    conflictPolicy?: SyncQueueItem["conflictPolicy"];
  },
): Promise<SyncQueueItem<T>> {
  const queued: SyncQueueItem<T> = {
    ...item,
    id: item.id ?? createQueueId(),
    createdAt: item.createdAt ?? new Date().toISOString(),
    conflictPolicy: item.conflictPolicy ?? conflictPolicyForPath(item.path),
  };
  await sync.enqueue(queued);
  return queued;
}

export async function pushChanges(
  sync: SyncProvider,
  network: NetworkProvider,
): Promise<{ pushed: number; failed: number }> {
  const pending = await sync.pending();
  let pushed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await network.request(item.method, item.path, item.body);
      await sync.remove(item.id);
      pushed += 1;
    } catch {
      failed += 1;
      break;
    }
  }

  return { pushed, failed };
}

export async function syncNow(
  sync: SyncProvider,
  network: NetworkProvider,
  pullUpdates: () => Promise<void>,
): Promise<SyncStatus> {
  try {
    await pushChanges(sync, network);
    await pullUpdates();
    return "online";
  } catch {
    return "failed";
  }
}

export function resolveConflict<T>(
  policy: SyncQueueItem["conflictPolicy"],
  serverValue: T,
  studentValue: T,
): T | { requiresManualResolution: true; serverValue: T; studentValue: T } {
  if (policy === "server-wins") return serverValue;
  if (policy === "student-wins") return studentValue;
  return { requiresManualResolution: true, serverValue, studentValue };
}

function createQueueId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
