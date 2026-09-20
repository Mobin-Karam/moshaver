export type CatalogLabel = { id: string; fa: string; en?: string };
export type GradeOption = { id: number; fa: string; en?: string; level_id: string };
export type EducationType = CatalogLabel & { levels: string[] };
export type TrackOption = CatalogLabel & { group_id?: string };
export type GradeStructure = { grades: number[]; level_id: string; education_type_ids: string[]; track_required: boolean };
export type EducationTaxonomy = {
  dataset: Record<string, unknown>;
  grades: GradeOption[];
  levels: CatalogLabel[];
  education_types: EducationType[];
  theoretical_tracks: TrackOption[];
  vocational_groups: TrackOption[];
  common_vocational_fields: TrackOption[];
  subject_categories: CatalogLabel[];
  grade_structure: GradeStructure[];
};
export type EducationBookRecord = {
  id: string; country: string; school_year: string; grade: number; level: string;
  branch: string; track: string; category: string; title_fa: string; title_en: string;
  textbook_code: string | null; applies_to: string[]; notes: string | null;
};
export type TextbookDataset = { dataset: Record<string, unknown>; taxonomy: Record<string, unknown>; books: EducationBookRecord[] };
