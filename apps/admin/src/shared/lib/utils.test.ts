import { describe, expect, it } from "vitest";
import { addDays, cn, englishDigits, fa, normalizePersianText, todayIso } from "./utils";

describe("Persian Tools integration", () => {
  it("normalizes English and Arabic digits to Persian", () => {
    expect(fa("Room 12 - ١٣")).toBe("Room ۱۲ - ۱۳");
  });

  it("normalizes Arabic characters for consistent Persian search", () => {
    expect(normalizePersianText("علي 123")).toBe("علی ۱۲۳");
  });

  it("converts Persian digits back for API-safe numeric input", () => {
    expect(englishDigits("۱۴۰۵/۰۶/۱۰")).toBe("1405/06/10");
  });

  it("handles empty values and merges utility classes", () => {
    expect(fa(null)).toBe("");
    expect(normalizePersianText(undefined)).toBe("");
    expect(englishDigits(null)).toBe("");
    expect(cn("px-2", false, "px-4")).toBe("px-4");
  });

  it("produces and shifts ISO dates", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addDays("2026-09-21", 1)).toBe("2026-09-22");
  });
});
