import { api } from "../../../shared/api/api";
import type { LiveSnapshot } from "../model/live.types";

type WireLiveStudent = {
  id: string;
  name: string;
  grade?: string;
  major?: string;
  presence?: {
    online?: boolean;
    state?: string;
    lastSeenAt?: string | null;
    currentTask?: { id?: string; title?: string } | null;
  };
  attention?: {
    score?: number;
    signals?: Array<{ type: string; count: number; weight: number }>;
  };
};

function liveState(student: WireLiveStudent) {
  if (!student.presence?.online) return "offline" as const;
  if (student.presence.state === "studying") return "studying" as const;
  if (student.presence.state === "exam" || student.presence.state === "quiz")
    return "taking_exam" as const;
  if (student.presence.state === "paused") return "paused" as const;
  return "online" as const;
}

function freshness(student: WireLiveStudent) {
  if (!student.presence?.online) return "offline" as const;
  const age = Date.now() - new Date(student.presence.lastSeenAt || 0).getTime();
  if (age <= 90_000) return "live" as const;
  if (age <= 5 * 60_000) return "recent" as const;
  return "stale" as const;
}

export function normalizeLiveSnapshot(result: LiveSnapshot | WireLiveStudent[]): LiveSnapshot {
  if (!Array.isArray(result)) return result;
  const students = result.map((student) => {
    const signals = student.attention?.signals || [];
    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      major: student.major,
      state: liveState(student),
      freshness: freshness(student),
      presence: {
        online: !!student.presence?.online,
        lastSeenAt: student.presence?.lastSeenAt || undefined,
      },
      activeSession: student.presence?.currentTask
        ? { title: student.presence.currentTask.title }
        : undefined,
      lastActivityAt: student.presence?.lastSeenAt || null,
      dueReviews: 0,
      remainingTasks: signals.find((item) => item.type === "MISSED_TASKS")?.count || 0,
      lastExamPercent: null,
      attentionScore: Number(student.attention?.score || 0),
      attentionSignals: signals,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    students,
    timeline: [],
    summary: {
      total: students.length,
      online: students.filter((student) => student.presence.online).length,
      studying: students.filter((student) => student.state === "studying").length,
      paused: students.filter((student) => student.state === "paused").length,
      takingExam: students.filter((student) => student.state === "taking_exam").length,
      attention: students.filter((student) => Number(student.attentionScore) > 0).length,
    },
  };
}

export async function getLiveStudentsSnapshot() {
  return normalizeLiveSnapshot(await api.get<LiveSnapshot | WireLiveStudent[]>("/live?limit=100"));
}
