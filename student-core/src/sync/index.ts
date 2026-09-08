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

  if (!pending.length) return { pushed, failed };
  try {
    const response = await network.request<{accepted:Array<{id:string}>;rejected:Array<{id?:string;code:string}>}>("POST", "/sync/upload", {
      changes: pending.map((item) => ({ id: item.id, clientMutationId: item.id, type: syncMutationType(item.path), method: item.method, path: item.path, body: item.body, createdAt: item.createdAt })),
    }, { skipSyncQueue: true });
    for (const item of response.accepted) { await sync.remove(item.id); pushed += 1; }
    failed = response.rejected.length;
  } catch { failed = pending.length; }

  return { pushed, failed };
}

export type SyncPullResult = { cursor: string; reset?: boolean; [key: string]: unknown };
export async function pullChanges(sync: SyncProvider, network: NetworkProvider, reconcile: (result: SyncPullResult) => Promise<void> | void) {
  const cursor = await sync.getCursor?.();
  const result = await network.request<SyncPullResult>("GET", `/sync${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, null, { skipSyncQueue: true });
  await reconcile(result);
  if (result.cursor) await sync.setCursor?.(result.cursor);
  return result;
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

export type SyncStatusListener = (status: SyncStatus) => void;

export class SyncWorker {
  private running = false;
  private flushing: Promise<{ pushed: number; failed: number }> | null = null;
  private status: SyncStatus = "offline";
  private readonly listeners = new Set<SyncStatusListener>();

  constructor(
    private readonly sync: SyncProvider,
    private readonly network: NetworkProvider,
    private readonly isOnline: () => boolean = () => true,
    private readonly pullUpdates?: () => Promise<void>,
  ) {}

  getStatus(): SyncStatus {
    return this.status;
  }

  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    this.running = true;
    if (this.isOnline()) void this.flush();
    else this.setStatus("offline");
  }

  stop(): void {
    this.running = false;
  }

  async flush(): Promise<{ pushed: number; failed: number }> {
    if (!this.running || !this.isOnline()) {
      this.setStatus("offline");
      return { pushed: 0, failed: 0 };
    }
    if (this.flushing) return this.flushing;

    this.setStatus("syncing");
    this.flushing = pushChanges(this.sync, this.network)
      .then(async (result) => {
        if (!result.failed && this.pullUpdates) await this.pullUpdates();
        this.setStatus(result.failed ? "failed" : "online");
        return result;
      })
      .catch((error) => {
        this.setStatus("failed");
        throw error;
      })
      .finally(() => {
        this.flushing = null;
      });
    return this.flushing;
  }

  setOffline(): void {
    this.setStatus("offline");
  }

  private setStatus(status: SyncStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener(status);
  }
}

function syncMutationType(path: string) {
  if (path.includes("/complete")) return "task_completion";
  if (path.includes("study-sessions")) return "study_session";
  if (path === "/reports") return "daily_report";
  if (path === "/recovery-requests") return "recovery_request";
  if (path.includes("/review")) return "learning_review";
  if (path.includes("/exams/attempts/")) return "exam_autosave";
  return "student_mutation";
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
