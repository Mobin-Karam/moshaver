import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { RelaxationTrack, Student, StudentDailyRelaxation } from "../../database/entities";
import { SaveRelaxationTrackDto } from "./relaxation.dto";

@Injectable()
export class RelaxationService {
  constructor(
    @InjectRepository(RelaxationTrack) private tracks: Repository<RelaxationTrack>,
    @InjectRepository(StudentDailyRelaxation) private selections: Repository<StudentDailyRelaxation>,
    @InjectRepository(Student) private students: Repository<Student>,
  ) {}

  listManaged() { return this.tracks.find({ order: { active: "DESC", updatedAt: "DESC" } }); }
  async create(input: SaveRelaxationTrackDto) { return this.tracks.save(this.tracks.create(this.clean(input))); }
  async update(id: string, input: SaveRelaxationTrackDto) { const row = await this.track(id); Object.assign(row, this.clean(input)); return this.tracks.save(row); }

  async today(userId: string) {
    const student = await this.student(userId);
    const date = this.localDate(student.user?.timezone);
    const tracks = await this.tracks.find({ where: { active: true }, order: { title: "ASC" } });
    if (!tracks.length) return { date, selectedBy: null, selected: null, tracks: [] };
    let selection = await this.selections.findOne({ where: { student: { id: student.id }, date }, relations: { track: true } });
    if (!selection || !selection.track.active) {
      const digest = createHash("sha256").update(`${student.id}:${date}`).digest();
      const selected = tracks[digest.readUInt32BE(0) % tracks.length];
      selection ||= this.selections.create({ student, date });
      Object.assign(selection, { track: selected, selectedBy: "AUTO" as const });
      selection = await this.selections.save(selection);
      selection.track = selected;
    }
    return { date, selectedBy: selection.selectedBy, selected: selection.track, tracks };
  }

  async select(userId: string, trackId: string) {
    const student = await this.student(userId);
    const track = await this.tracks.findOne({ where: { id: trackId, active: true } });
    if (!track) throw new ApiException(404, "RELAXATION_TRACK_NOT_FOUND", "موسیقی فعال پیدا نشد.");
    const date = this.localDate(student.user?.timezone);
    let selection = await this.selections.findOne({ where: { student: { id: student.id }, date } });
    selection ||= this.selections.create({ student, date });
    Object.assign(selection, { track, selectedBy: "STUDENT" as const });
    await this.selections.save(selection);
    return this.today(userId);
  }

  private async student(userId: string) { const row = await this.students.findOne({ where: { user: { id: userId } }, relations: { user: true } }); if (!row) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد."); return row; }
  private async track(id: string) { const row = await this.tracks.findOneBy({ id }); if (!row) throw new ApiException(404, "RELAXATION_TRACK_NOT_FOUND", "موسیقی پیدا نشد."); return row; }
  private clean(input: SaveRelaxationTrackDto) { const url = new URL(input.url); if (url.protocol !== "https:") throw new ApiException(400, "RELAXATION_URL_INVALID", "پیوند موسیقی باید HTTPS باشد."); return { title: input.title.trim(), artist: input.artist?.trim() || "", url: url.toString(), active: input.active ?? true }; }
  private localDate(timezone = "Asia/Tehran") { try { return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } }
}
