import { describe, expect, it } from "vitest";
import { englishDigits, fa, normalizePersianText } from "./utils";

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
});
