export type Subject = {
  id: string;
  name: string;
  subject_key?: string;
  subjectKey?: string;
  display_order?: number;
  displayOrder?: number;
  status?: string;
  progress?: number;
  mastery?: string;
  note?: string;
};

export type SubjectsMode = "student" | "catalog";
