export type Subject = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  organization?: { id: string; name: string } | null;
};

export type StudentSubject = {
  subject: Pick<Subject, "id" | "code" | "name">;
  enabled: boolean;
  displayName: string;
  weeklyTargetMinutes: number;
};

export type SubjectsMode = "student" | "catalog";
