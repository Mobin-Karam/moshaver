import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../shared/api/api";
import { createLearningItem, reviewLearningItem, updateLearningItem } from "./learning.api";

const values = {
  title: "مرور مشتق",
  subject: "ریاضی",
  book: "حسابان",
  chapter: "مشتق",
  lesson: "قاعده زنجیره‌ای",
  topic: "تمرین",
  note: "مثال‌های نشان‌دار",
  hint: "از تعریف شروع کن",
  dueDate: "2026-09-20",
  mastery: 4,
  status: "done" as const,
};

describe("learning API contract", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("omits computed mastery and create-only forbidden status", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);

    await createLearningItem("student-1", values);

    expect(post).toHaveBeenCalledWith(
      "/students/student-1/learning",
      expect.not.objectContaining({ mastery: expect.anything(), status: expect.anything() }),
    );
  });

  it("keeps editable status on update but still omits computed mastery", async () => {
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);

    await updateLearningItem("student-1", "item-1", values);

    expect(patch).toHaveBeenCalledWith(
      "/students/student-1/learning/item-1",
      expect.objectContaining({ status: "done" }),
    );
    expect(patch.mock.calls[0]?.[1]).not.toHaveProperty("mastery");
  });

  it("submits staff reviews through the scoped review endpoint", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);

    await reviewLearningItem("student-1", "item-1", 5);

    expect(post).toHaveBeenCalledWith("/students/student-1/learning/item-1/review", {
      rating: 5,
    });
  });
});
