import {
  Exam,
  ExamAssignment,
  ImportHistory,
  Organization,
  Plan,
  Student,
  User,
} from "../src/database/entities";
import { ImportExportService } from "../src/modules/import-export/import-export.service";

const context = {
  id: "advisor-1",
  role: "ADVISOR",
  roles: ["ADVISOR"],
  capabilities: ["import.preview", "import.commit", "export.read"],
  membershipIds: [],
  organizationIds: ["org-1"],
} as any;

function authorization() {
  return {
    requireCapability: jest.fn(),
    canAccessStudent: jest.fn(async () => true),
    canAccessOrganization: jest.fn(() => true),
  };
}

describe("ImportExportService", () => {
  it("reports existing rows as preview conflicts without hiding valid counts", async () => {
    const manager = {
      find: jest.fn(async (entity: unknown) =>
        entity === Plan ? [{ date: "2026-09-20" }] : [],
      ),
    };
    const service = new ImportExportService(
      { manager } as any,
      authorization() as any,
    );
    const preview = await service.preview(context, {
      schemaVersion: "2.0",
      studentId: "student-1",
      scope: "plans",
      plans: [
        { date: "2026-09-20", tasks: [{ type: "STUDY", title: "مطالعه" }] },
      ],
    });

    expect(preview.valid).toBe(true);
    expect(preview.summary).toEqual(
      expect.objectContaining({ plans: 1, tasks: 1, conflicts: 1 }),
    );
    expect(preview.conflicts).toEqual(["برنامه 2026-09-20 از قبل وجود دارد."]);
  });

  it("imports an exam as published and assigns it only to the selected student", async () => {
    const actor = { id: "advisor-1" };
    const student = { id: "student-1" };
    const organization = { id: "org-1" };
    const saved: Array<{ entity: unknown; value: any }> = [];
    const manager = {
      find: jest.fn(async () => []),
      findOneByOrFail: jest.fn(async (entity: unknown) =>
        entity === User ? actor : entity === Student ? student : organization,
      ),
      findOne: jest.fn(async () => null),
      findOneBy: jest.fn(async () => organization),
      create: jest.fn((_entity: unknown, value: any) => value),
      delete: jest.fn(),
      save: jest.fn(async (entity: unknown, value: any) => {
        const result = {
          id:
            entity === ImportHistory
              ? "history-1"
              : entity === Exam
                ? "exam-1"
                : "saved-1",
          ...value,
        };
        saved.push({ entity, value: result });
        return result;
      }),
    };
    const db = {
      manager,
      transaction: jest.fn(async (work: any) => work(manager)),
    } as any;
    const service = new ImportExportService(db, authorization() as any);

    const result = await service.commit(context, actor.id, {
      schemaVersion: "2.0",
      studentId: student.id,
      scope: "exams",
      publishImported: true,
      exams: [
        {
          title: "آزمون ریاضی",
          subject: "ریاضی",
          durationMinutes: 45,
          maxAttempts: 1,
          questions: [
            { text: "۲+۲؟", options: ["۱", "۲", "۳", "۴"], correctAnswer: "۴" },
          ],
        },
      ],
    });

    expect(saved.find((item) => item.entity === Exam)?.value).toEqual(
      expect.objectContaining({ published: true, organization }),
    );
    expect(saved.find((item) => item.entity === ExamAssignment)?.value).toEqual(
      expect.objectContaining({
        student,
        assignedBy: actor,
        exam: expect.objectContaining({ id: "exam-1" }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ exams: 1, published: true }),
    );
  });

  it("does not replace a plan that already contains completed work", async () => {
    const manager = {
      find: jest.fn(async () => []),
      findOneByOrFail: jest.fn(async (entity: unknown) =>
        entity === User ? { id: "advisor-1" } : { id: "student-1" },
      ),
      findOne: jest.fn(async (entity: unknown) =>
        entity === Plan ? { id: "plan-1", tasks: [{ status: "DONE" }] } : null,
      ),
      findOneBy: jest.fn(),
      create: jest.fn((_entity: unknown, value: any) => value),
      delete: jest.fn(),
      save: jest.fn(),
    };
    const db = {
      manager,
      transaction: jest.fn(async (work: any) => work(manager)),
    } as any;
    const service = new ImportExportService(db, authorization() as any);

    await expect(
      service.commit(context, "advisor-1", {
        schemaVersion: "2.0",
        studentId: "student-1",
        scope: "plans",
        replaceExistingPlans: true,
        plans: [
          { date: "2026-09-20", tasks: [{ type: "STUDY", title: "مطالعه" }] },
        ],
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(manager.delete).not.toHaveBeenCalled();
  });
});
