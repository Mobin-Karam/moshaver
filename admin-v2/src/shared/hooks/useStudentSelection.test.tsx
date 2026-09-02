import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/api";
import { useStudentSelection } from "./useStudentSelection";

vi.mock("../api/api", () => ({ api: { get: vi.fn() } }));

const roster = [
  { id: "student-1", name: "اول" },
  { id: "student-2", name: "دوم" },
];

function wrapper(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function TestProviders({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter></QueryClientProvider>;
  };
}

function useSelection(clearOnChange: string[] = []) {
  const selection = useStudentSelection({ clearOnChange });
  return { ...selection, searchParams: new URLSearchParams(useLocation().search) };
}

describe("global student selection", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.get).mockReset().mockResolvedValue(roster);
  });

  it("uses a valid URL student immediately after the roster loads", async () => {
    localStorage.setItem("admin-selected-student-id", "student-1");
    const { result } = renderHook(() => useSelection(), { wrapper: wrapper("/admin/planner?studentId=student-2") });
    await waitFor(() => expect(result.current.studentId).toBe("student-2"));
    await waitFor(() => expect(localStorage.getItem("admin-selected-student-id")).toBe("student-2"));
  });

  it("repairs an invalid URL and never exposes it as the effective student", async () => {
    localStorage.setItem("admin-selected-student-id", "student-1");
    const { result } = renderHook(() => useSelection(), { wrapper: wrapper("/admin/exams?studentId=removed") });
    await waitFor(() => expect(result.current.studentId).toBe("student-1"));
    await waitFor(() => expect(result.current.searchParams.get("studentId")).toBe("student-1"));
  });

  it("updates storage and URL atomically and clears dependent page state", async () => {
    const { result } = renderHook(() => useSelection(["examId", "search"]), {
      wrapper: wrapper("/admin/questions?studentId=student-1&examId=exam-1&search=test"),
    });
    await waitFor(() => expect(result.current.students).toHaveLength(2));
    act(() => result.current.selectStudent("student-2"));
    await waitFor(() => expect(result.current.searchParams.get("studentId")).toBe("student-2"));
    expect(result.current.studentId).toBe("student-2");
    expect(result.current.searchParams.has("examId")).toBe(false);
    expect(result.current.searchParams.has("search")).toBe(false);
    expect(localStorage.getItem("admin-selected-student-id")).toBe("student-2");
  });
});
