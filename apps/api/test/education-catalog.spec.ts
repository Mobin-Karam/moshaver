import { EducationCatalogService } from "../src/modules/education-catalog/education-catalog.service";
import { isValidIranianNationalCode, normalizeNationalCode } from "../src/modules/onboarding/national-code";

describe("Iran education signup catalog", () => {
  const catalog = new EducationCatalogService({} as any);

  it("normalizes Persian digits and validates the national checksum", () => {
    expect(normalizeNationalCode("۹۰۰۰۰۰۰۰۱۷")).toBe("9000000017");
    expect(isValidIranianNationalCode("۹۰۰۰۰۰۰۰۱۷")).toBe(true);
    expect(isValidIranianNationalCode("1111111111")).toBe(false);
    expect(isValidIranianNationalCode("9000000018")).toBe(false);
  });

  it("accepts the correct grade/type/track combinations", () => {
    expect(catalog.validateSelection(9, "general")).toEqual(expect.objectContaining({ gradeId: 9, trackId: "general" }));
    expect(catalog.validateSelection(12, "theoretical", "experimental_sciences")).toEqual(expect.objectContaining({ gradeLabel: "پایه دوازدهم", trackLabel: "علوم تجربی" }));
    for (const selection of [[8, "theoretical", "experimental_sciences"], [11, "theoretical", "computer_network_software"]] as const) {
      try { catalog.validateSelection(selection[0], selection[1], selection[2]); throw new Error("expected selection rejection"); }
      catch (error) { expect((error as { getResponse?: () => unknown }).getResponse?.()).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: "INVALID_EDUCATION_SELECTION" }) })); }
    }
  });

  it("publishes all twelve grades from the supplied taxonomy", () => {
    const options = catalog.signupOptions();
    expect(options.schoolYear).toBe("1405-1406");
    expect(options.grades.map((grade) => grade.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("does not mix vocational books into a theoretical student book list", async () => {
    const rows = [
      { id: "theory", branch: "نظری", track: "علوم تجربی", appliesTo: ["علوم تجربی"] },
      { id: "vocational", branch: "فنی و حرفه‌ای / کاردانش", track: "مشترک", appliesTo: ["فنی و حرفه‌ای"] },
      { id: "shared", branch: "مشترک", track: "مشترک", appliesTo: [] },
    ];
    const service = new EducationCatalogService({ find: jest.fn().mockResolvedValue(rows) } as any);
    await expect(service.listBooks(12, "theoretical", "experimental_sciences")).resolves.toEqual([rows[0], rows[2]]);
  });
});
