import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/api";
import { useStudents } from "./useStudents";

vi.mock("../api/api", () => ({ api: { get: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useStudents education context", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.get).mockResolvedValue([
      { id: "student-1", name: "اول" },
      { id: "student-2", name: "دوم" },
    ]);
  });

  it("repairs a stale persisted selection and stores the valid fallback", async () => {
    localStorage.setItem("admin-selected-student-id", "removed-student");
    const { result } = renderHook(() => useStudents(), { wrapper });
    await waitFor(() => expect(result.current.studentId).toBe("student-1"));
    await waitFor(() => expect(localStorage.getItem("admin-selected-student-id")).toBe("student-1"));
  });

  it("persists a new selection for the next Education route", async () => {
    const { result } = renderHook(() => useStudents(), { wrapper });
    await waitFor(() => expect(result.current.students).toHaveLength(2));
    result.current.setStudentId("student-2");
    await waitFor(() => expect(result.current.studentId).toBe("student-2"));
    expect(localStorage.getItem("admin-selected-student-id")).toBe("student-2");
  });
});
