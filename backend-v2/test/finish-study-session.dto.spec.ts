import { validate } from "class-validator";
import { FinishStudySessionDto } from "../src/modules/study-sessions/dto/finish-study-session.dto";

describe("FinishStudySessionDto", () => {
  it("accepts string difficulty and note from a paused timer completion", async () => {
    const dto = Object.assign(new FinishStudySessionDto(), {
      actualTests: 12,
      difficulty: "متوسط",
      note: "جلسه با مکث تکمیل شد",
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it("rejects overlong string feedback", async () => {
    const dto = Object.assign(new FinishStudySessionDto(), {
      difficulty: "x".repeat(65),
      note: "x".repeat(2001),
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(["difficulty", "note"]));
  });
});
