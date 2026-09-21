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

export type SubjectsMode = "student" | "catalog" | "books";

export type EducationBook = {
  id: string;
  schoolYear: string;
  grade: number;
  level: string;
  branch: string;
  track: string;
  category: string;
  titleFa: string;
  titleEn: string;
  textbookCode?: string | null;
  appliesTo: string[];
  notes?: string | null;
};
