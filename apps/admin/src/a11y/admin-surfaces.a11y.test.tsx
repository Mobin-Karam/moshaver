import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RoleDashboard } from "../features/dashboard/components/RoleDashboard";
import { NotificationCenterPanel } from "../features/notifications/components/NotificationCenterPanel";
import { StudentList } from "../features/students/components/StudentList";
import { LocaleProvider } from "../shared/ui/locale";

const auth = {
  status: "anonymous",
  activeRole: "ADVISOR",
  capabilities: ["students.read", "plans.read"],
  can: (capability: string) => ["students.read", "plans.read"].includes(capability),
  login: vi.fn(),
};

const notifications = {
  unread: 0,
  loading: false,
  error: false,
  errorMessage: null,
  markingAllRead: false,
  refreshing: false,
  hasMore: false,
  loadingMore: false,
  markAllRead: vi.fn(),
  refresh: vi.fn(),
  markRead: vi.fn(),
  loadMore: vi.fn(),
};

vi.mock("../features/auth/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("../features/auth", () => ({ useAuth: () => auth }));
vi.mock("../features/notifications/hooks/useAdminNotifications", () => ({
  useAdminNotifications: () => notifications,
}));

async function expectAccessible(container: HTMLElement) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

afterEach(cleanup);

describe("Admin v2 accessibility smoke", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ ok: true, data: { status: "ok" } })),
    ) as typeof fetch;
  });

  it("has no automated violations on login", async () => {
    const view = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await expectAccessible(view.container);
  });

  it("has no automated violations on the role dashboard", async () => {
    const view = render(
      <MemoryRouter>
        <RoleDashboard
          data={{
            context: "ADVISOR",
            generatedAt: "2026-09-06T00:00:00.000Z",
            assignedStudents: 2,
            unreadConversations: 1,
          }}
          loading={false}
          error={false}
          refreshing={false}
          attention={[]}
          attentionLoading={false}
          attentionError={false}
          onRefresh={vi.fn()}
          onRetry={vi.fn()}
          onRetryAttention={vi.fn()}
        />
      </MemoryRouter>,
    );
    await expectAccessible(view.container);
  });

  it("has no automated violations on the student directory", async () => {
    const view = render(
      <StudentList
        students={[{ id: "student-1", name: "دانش‌آموز نمونه", username: "student.demo" }]}
        total={1}
        filteredTotal={1}
        page={1}
        pageCount={1}
        pageSize={25}
        setPage={vi.fn()}
        setPageSize={vi.fn()}
        selectedId="student-1"
        search=""
        setSearch={vi.fn()}
        status="all"
        profileFilter="all"
        sort="name"
        sortDirection="asc"
        onSort={vi.fn()}
        onClearFilters={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    await expectAccessible(view.container);
  });

  it("has no automated violations on notifications", async () => {
    const view = render(
      <MemoryRouter>
        <LocaleProvider>
          <NotificationCenterPanel
            mobilePanel="notifications"
            filter="all"
            setFilter={vi.fn()}
            typeFilter="all"
            setTypeFilter={vi.fn()}
            search=""
            setSearch={vi.fn()}
            items={[]}
          />
        </LocaleProvider>
      </MemoryRouter>,
    );
    await expectAccessible(view.container);
  });
});
