import { describe, expect, it } from "vitest";
import { adminContentOffsetClass } from "./layout-geometry";

describe("admin layout geometry", () => {
  it("reserves only the primary sidebar when a contextual rail is not useful", () => {
    expect(adminContentOffsetClass({ showContextRail: false, mainCollapsed: false, contextCollapsed: false })).toBe("lg:mr-64");
    expect(adminContentOffsetClass({ showContextRail: false, mainCollapsed: true, contextCollapsed: false })).toBe("lg:mr-[4.5rem]");
  });

  it("keeps the contextual rail compact on lg and respects its saved state on xl", () => {
    expect(adminContentOffsetClass({ showContextRail: true, mainCollapsed: false, contextCollapsed: false })).toBe("lg:mr-80 xl:mr-[29rem]");
    expect(adminContentOffsetClass({ showContextRail: true, mainCollapsed: false, contextCollapsed: true })).toBe("lg:mr-80");
    expect(adminContentOffsetClass({ showContextRail: true, mainCollapsed: true, contextCollapsed: false })).toBe("lg:mr-[8.5rem] xl:mr-[17.5rem]");
    expect(adminContentOffsetClass({ showContextRail: true, mainCollapsed: true, contextCollapsed: true })).toBe("lg:mr-[8.5rem]");
  });
});
