import { AnalyticsService } from "../src/modules/analytics/analytics.service";

describe("AnalyticsService", () => {
  it("qualifies task columns when joining plans", async () => {
    const db = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes("FROM tasks")) return [{ total: 1, completed: 1 }];
        if (sql.includes("study_sessions")) return [{ seconds: 0, sessions: 0 }];
        if (sql.includes("exam_attempts")) return [{ average: null, attempts: 0 }];
        if (sql.includes("quiz_attempts")) return [{ average: null, attempts: 0 }];
        if (sql.includes("learning_reviews")) return [{ reviews: 0, mastery: null }];
        return [];
      }),
    };
    const service = new AnalyticsService(db as any, {} as any, {} as any, {} as any, {} as any);

    await service.metrics("student-1", "staff");

    const taskSql = db.query.mock.calls.find(([sql]) => sql.includes("FROM tasks"))?.[0];
    expect(taskSql).toContain("t.completedAt");
    expect(taskSql).toContain("t.status='DONE'");
  });
});
