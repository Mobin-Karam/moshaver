import type {
  ActiveStudySession,
  StudentTask,
  TaskRuntimeStatus,
} from '../types.js';

export function sortStudentTasks(tasks: StudentTask[]): StudentTask[] {
  return [...tasks].sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end) || left.id.localeCompare(right.id));
}

export function plannedMinutes(task: Pick<StudentTask, 'start' | 'end'>): number {
  const start = parseTime(task.start);
  const end = parseTime(task.end);
  return Math.max(0, end - start);
}

export function taskStatus(
  task: StudentTask,
  nowTime: string,
): TaskRuntimeStatus {
  if (task.completion) {
    return task.completion.status;
  }
  if (task.start <= nowTime && nowTime < task.end) {
    return 'current';
  }
  if (task.end <= nowTime) {
    return 'overdue';
  }
  return 'next';
}

export function currentAndNextTask(
  tasks: StudentTask[],
  nowTime: string,
  activeSession?: ActiveStudySession | null,
): { current: StudentTask | null; next: StudentTask | null } {
  let current: StudentTask | null = null;
  let next: StudentTask | null = null;

  for (const task of tasks) {
    if (task.completion) continue;
    if (task.start <= nowTime && nowTime < task.end) {
      current = task;
      break;
    }
    if (!next && task.start > nowTime) {
      next = task;
    }
  }

  if (!current && activeSession) {
    current = tasks.find((task) => task.id === activeSession.taskId) ?? null;
  }

  return { current, next };
}

export function planMetrics(tasks: StudentTask[]): {
  totalTasks: number;
  doneTasks: number;
  partialTasks: number;
  plannedMinutes: number;
  actualMinutes: number;
  plannedTests: number;
  actualTests: number;
} {
  return tasks.reduce(
    (acc, task) => {
      acc.totalTasks += 1;
      acc.plannedMinutes += plannedMinutes(task);
      acc.plannedTests += Number(task.testCount ?? 0);
      if (task.completion?.status === 'done') acc.doneTasks += 1;
      if (task.completion?.status === 'partial') acc.partialTasks += 1;
      acc.actualMinutes += Number(task.completion?.actualMinutes ?? 0);
      acc.actualTests += Number(task.completion?.actualTests ?? 0);
      return acc;
    },
    {
      totalTasks: 0,
      doneTasks: 0,
      partialTasks: 0,
      plannedMinutes: 0,
      actualMinutes: 0,
      plannedTests: 0,
      actualTests: 0,
    },
  );
}

function parseTime(value: string): number {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}
