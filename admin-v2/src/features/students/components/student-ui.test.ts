import { describe, expect, it } from "vitest";
import type { Student } from "../../../shared/types/domain";
import { formatStudentLastSeen, getMissingStudentProfileFields, getStudentProfileCompleteness, getStudentStatus } from "./student-ui";

const completeStudent: Student = {
  id: "student-1",
  name: "دانش‌آموز نمونه",
  username: "student1",
  grade: "دوازدهم",
  major: "تجربی",
  targetUniversity: "دانشگاه تهران",
  targetField: "پزشکی",
  targetRank: "1000",
  dailyCapacity: "6 ساعت",
  accountStatus: "active",
};

describe("student UI helpers", () => {
  it("normalizes account state from the available student fields", () => {
    expect(getStudentStatus(completeStudent)).toBe("active");
    expect(getStudentStatus({ ...completeStudent, accountStatus: "inactive" })).toBe("inactive");
    expect(getStudentStatus({ ...completeStudent, accountStatus: undefined, active: false })).toBe("inactive");
    expect(getStudentStatus({ ...completeStudent, accountStatus: "archived" })).toBe("archived");
  });

  it("computes profile completeness only from data already available on Student", () => {
    expect(getStudentProfileCompleteness(completeStudent)).toBe(100);
    expect(getStudentProfileCompleteness({ ...completeStudent, major: "", targetUniversity: "" })).toBe(75);
  });

  it("reports missing profile fields for actionable overview UI", () => {
    expect(getMissingStudentProfileFields(completeStudent)).toEqual([]);
    expect(getMissingStudentProfileFields({ ...completeStudent, targetRank: "", dailyCapacity: "" })).toEqual(["رتبه هدف", "ظرفیت روزانه"]);
  });

  it("handles missing and invalid last-seen values without throwing", () => {
    expect(formatStudentLastSeen()).toBe("بدون فعالیت ثبت‌شده");
    expect(formatStudentLastSeen("not-a-date")).toBe("زمان نامشخص");
  });
});
