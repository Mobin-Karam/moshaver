import { Injectable } from "@nestjs/common";

@Injectable()
export class AnalyticsService {
  studentHealth(studentId: string) {
    return { studentId, healthScore: null, studyConsistency: null, examReadiness: null, mistakeAnalysis: [], recommendations: [] };
  }
}
