import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdvisorInbox } from "./api/notifications.api";
import { useAdvisorInbox } from "./hooks/useAdvisorInbox";
import { notificationAccess } from "./pages/NotificationsPage";

vi.mock("./api/notifications.api", () => ({
  getAdvisorInbox: vi.fn(),
  updateRecoveryRequest: vi.fn(),
  updateTaskIssue: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("notification role access", () => {
  beforeEach(() => vi.mocked(getAdvisorInbox).mockReset());

  it.each([
    ["content manager", [], false],
    ["teacher", ["students.read", "exams.read"], false],
    ["advisor", ["students.read", "recovery_requests.read", "recovery_requests.manage", "tasks.update"], true],
  ])("derives the correct advisor section for %s", (_name, capabilities, expected) => {
    expect(notificationAccess(capabilities as string[]).advisorInbox).toBe(expected);
  });

  it("changes sections when a multi-role account changes work context", () => {
    const teacher = notificationAccess(["students.read", "exams.read"]);
    const advisor = notificationAccess([
      "students.read",
      "recovery_requests.read",
      "recovery_requests.manage",
      "tasks.update",
    ]);

    expect(teacher.advisorInbox).toBe(false);
    expect(advisor).toEqual({ advisorInbox: true, manageRecovery: true, manageIssues: true });
  });

  it("does not request advisor data when the section is disabled", () => {
    const { result } = renderHook(
      () => useAdvisorInbox("student-1", { enabled: false, scopeKey: "CONTENT_MANAGER:org-1" }),
      { wrapper },
    );

    expect(result.current.inbox.fetchStatus).toBe("idle");
    expect(getAdvisorInbox).not.toHaveBeenCalled();
  });
});
