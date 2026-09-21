export type Label = { id: string; fa: string; en?: string };

export type Grade = { id: number; fa: string; level_id: string };

export type Structure = {
  grades: number[];
  education_type_ids: string[];
  track_required: boolean;
};

export type SignupOptions = {
  schoolYear: string;
  grades: Grade[];
  educationTypes: Array<Label & { levels: string[] }>;
  theoreticalTracks: Label[];
  vocationalFields: Array<Label & { group_id?: string }>;
  gradeStructure: Structure[];
};

export type Book = { id: string; titleFa: string; category: string };

export type FormState = {
  firstName: string;
  lastName: string;
  nationalCode: string;
  password: string;
  confirm: string;
  grade: string;
  educationTypeId: string;
  trackId: string;
};

export type Touched = Partial<Record<keyof FormState, boolean>>;

export const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  nationalCode: '',
  password: '',
  confirm: '',
  grade: '',
  educationTypeId: '',
  trackId: '',
};