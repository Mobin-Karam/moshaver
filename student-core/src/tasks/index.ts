import type { StudentTask, TaskCompletionStatus } from '../types.js';
import { plannedMinutes } from '../planner/index.js';

export function createTaskCompletionPayload(
  task: StudentTask,
  status: TaskCompletionStatus,
  activeStartedAt?: string | null,
  now: Date = new Date(),
): {
  status: TaskCompletionStatus;
  actualMinutes: number;
  actualTests: number;
  note: string;
} {
  const actualMinutes = activeStartedAt
    ? Math.max(0, Math.round((now.getTime() - new Date(activeStartedAt).getTime()) / 60000))
    : plannedMinutes(task);

  return {
    status,
    actualMinutes,
    actualTests: status === 'done' ? Number(task.testCount ?? 0) : 0,
    note: '',
  };
}
