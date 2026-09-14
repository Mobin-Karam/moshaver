import { api } from "../../../shared/api/api";

export type GuardianStudent = {
  id: string;
  name: string;
  grade?: string;
  major?: string;
  targetUniversity?: string;
  targetField?: string;
};
export type GuardianProgress = {
  studentId: string;
  today: { date: string; totalTasks: number; completedTasks: number };
  weekly: {
    from: string;
    to: string;
    totalTasks: number;
    completedTasks: number;
    completionPercent: number;
    studyMinutes: number;
  };
};
export type GuardianSchedule = Array<{
  id: string;
  date: string;
  tasks: Array<{
    id: string;
    title: string;
    subject?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    status?: string;
    completed: boolean;
  }>;
}>;
export type GuardianExam = Record<string, unknown> & {
  id: string;
  title?: string;
  scheduledAt?: string;
  status?: string;
};
export type GuardianReport = {
  id: string;
  planDate: string;
  studyHours?: number;
  tests?: number;
  correct?: number;
  wrong?: number;
  blank?: number;
  focus?: number;
  fatigue?: number;
  motivation?: number;
};
export type GuardianDashboard = {
  student: GuardianStudent;
  today: GuardianProgress["today"];
  weekly: GuardianProgress["weekly"];
  upcomingExams: GuardianExam[];
  schedule: GuardianSchedule;
  attention: Array<{ type: string; message: string }>;
};
export type GuardianResource = { id: string; title: string; description?: string; url?: string };
export type RelatedStudent = {
  student: { id: string; name: string };
  relationship: { id?: string; type: string; status: string; organizationId?: string | null };
};

export const guardianApi = {
  students: () => api.get<GuardianStudent[]>("/guardian/students"),
  relatedStudents: () => api.get<RelatedStudent[]>("/me/students"),
  assignedResources: (studentId: string) =>
    api.get<GuardianResource[]>(
      `/learning-resources/assigned?studentId=${encodeURIComponent(studentId)}`,
    ),
  dashboard: (studentId: string) =>
    api.get<GuardianDashboard>(`/guardian/students/${studentId}/dashboard`),
  progress: (studentId: string) =>
    api.get<GuardianProgress>(`/guardian/students/${studentId}/progress`),
  schedule: (studentId: string) =>
    api.get<GuardianSchedule>(`/guardian/students/${studentId}/schedule`),
  exams: (studentId: string) => api.get<GuardianExam[]>(`/guardian/students/${studentId}/exams`),
  reports: (studentId: string) =>
    api.get<GuardianReport[]>(`/guardian/students/${studentId}/reports`),
  encourage: (studentId: string, body: { message: string; kind?: string }) =>
    api.post<{ id: string; createdAt: string }>(
      `/guardian/students/${studentId}/encouragement`,
      body,
    ),
};
