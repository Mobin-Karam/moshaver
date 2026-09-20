import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { EducationBook } from "../../database/entities/education-book.entity";
import taxonomyJson from "./data/iran-school-taxonomy-1405-1406.json";
import textbooksJson from "./data/iran-school-textbooks-1405-1406.json";
import type { EducationTaxonomy, TextbookDataset } from "./education-catalog.types";

const taxonomy = taxonomyJson as EducationTaxonomy;
const textbooks = textbooksJson as TextbookDataset;

@Injectable()
export class EducationCatalogService {
  constructor(@InjectRepository(EducationBook) private readonly books: Repository<EducationBook>) {}

  signupOptions() {
    return {
      schoolYear: taxonomy.dataset.school_year,
      grades: taxonomy.grades,
      levels: taxonomy.levels,
      educationTypes: taxonomy.education_types,
      theoreticalTracks: taxonomy.theoretical_tracks,
      vocationalGroups: taxonomy.vocational_groups,
      vocationalFields: taxonomy.common_vocational_fields,
      gradeStructure: taxonomy.grade_structure,
    };
  }

  validateSelection(grade: number, educationTypeId: string, trackId?: string) {
    const structure = taxonomy.grade_structure.find((item) => item.grades.includes(grade));
    if (!structure || !structure.education_type_ids.includes(educationTypeId)) {
      throw new ApiException(422, "INVALID_EDUCATION_SELECTION", "پایه و نوع آموزش با یکدیگر سازگار نیستند.");
    }
    const normalizedTrack = structure.track_required ? (trackId || "").trim() : "general";
    const allowed = educationTypeId === "theoretical"
      ? taxonomy.theoretical_tracks
      : ["technical_vocational", "kar_danesh"].includes(educationTypeId)
        ? taxonomy.common_vocational_fields
        : [{ id: "general", fa: "عمومی" }];
    if (!allowed.some((item) => item.id === normalizedTrack)) {
      throw new ApiException(422, "INVALID_EDUCATION_SELECTION", "رشته انتخاب‌شده برای این پایه معتبر نیست.");
    }
    const gradeLabel = taxonomy.grades.find((item) => item.id === grade)?.fa;
    const trackLabel = allowed.find((item) => item.id === normalizedTrack)?.fa || "عمومی";
    if (!gradeLabel) throw new ApiException(422, "INVALID_EDUCATION_SELECTION", "پایه انتخاب‌شده معتبر نیست.");
    return { gradeId: grade, gradeLabel, educationTypeId, trackId: normalizedTrack, trackLabel };
  }

  async listBooks(grade?: number, educationTypeId?: string, trackId?: string) {
    const rows = await this.books.find({ where: grade ? { grade } : {}, order: { grade: "ASC", category: "ASC", titleFa: "ASC" } });
    const branchFiltered = educationTypeId
      ? rows.filter((book) => {
          if (book.branch === "مشترک") return true;
          if (educationTypeId === "general") return book.branch === "عمومی";
          if (educationTypeId === "theoretical") return book.branch === "نظری";
          if (educationTypeId === "technical_vocational") return book.branch.includes("فنی و حرفه‌ای");
          if (educationTypeId === "kar_danesh") return book.branch.includes("کاردانش");
          return false;
        })
      : rows;
    if (!trackId || trackId === "general") return branchFiltered;
    const track = [...taxonomy.theoretical_tracks, ...taxonomy.common_vocational_fields].find((item) => item.id === trackId)?.fa;
    if (!track) return [];
    return branchFiltered.filter((book) => book.track === "مشترک" || book.branch === "مشترک" || book.appliesTo.includes(track));
  }

  datasets() { return { taxonomy, textbooks }; }

  async seed() { return seedEducationCatalog(this.books.manager); }
}

export async function seedEducationCatalog(manager: EntityManager) {
    const repository = manager.getRepository(EducationBook);
    const records = textbooks.books.map((book) => repository.create({
      id: book.id, country: book.country, schoolYear: book.school_year, grade: book.grade,
      level: book.level, branch: book.branch, track: book.track, category: book.category,
      titleFa: book.title_fa, titleEn: book.title_en, textbookCode: book.textbook_code,
      appliesTo: book.applies_to, notes: book.notes,
    }));
    await repository.save(records, { chunk: 100 });
    return records.length;
}
