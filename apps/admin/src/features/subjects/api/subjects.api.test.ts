import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../shared/api/api";
import {
  createSubject,
  getStudentSubjects,
  getSubjects,
  setSubjectActive,
  updateStudentSubject,
  updateSubject,
} from "./subjects.api";

describe("subjects API contract", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses the backend catalog fields and optional archive view", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([] as never);

    await getSubjects();
    await getSubjects(true);
    await getStudentSubjects("student-1");

    expect(get).toHaveBeenNthCalledWith(1, "/subjects");
    expect(get).toHaveBeenNthCalledWith(2, "/subjects?includeArchived=true");
    expect(get).toHaveBeenNthCalledWith(3, "/students/student-1/subjects");
  });

  it("sends only DTO-approved catalog fields", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);

    await createSubject({ code: "math", name: "ریاضی" });
    await updateSubject("subject-1", { name: "ریاضی پایه" });
    await setSubjectActive("subject-1", false);

    expect(post).toHaveBeenCalledWith("/subjects", { code: "math", name: "ریاضی" });
    expect(patch).toHaveBeenNthCalledWith(1, "/subjects/subject-1", {
      name: "ریاضی پایه",
    });
    expect(patch).toHaveBeenNthCalledWith(2, "/subjects/subject-1/archive", {
      active: false,
    });
  });

  it("sends student settings using the nested subject identifier", async () => {
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);

    await updateStudentSubject("student-1", {
      subject: { id: "subject-1", code: "math", name: "ریاضی" },
      enabled: true,
      displayName: "ریاضی پایه",
      weeklyTargetMinutes: 240,
    });

    expect(patch).toHaveBeenCalledWith("/students/student-1/subjects/subject-1", {
      enabled: true,
      displayName: "ریاضی پایه",
      weeklyTargetMinutes: 240,
    });
  });
});
