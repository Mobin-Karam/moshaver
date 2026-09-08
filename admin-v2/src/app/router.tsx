import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../shared/ui/ui";
import { LoginPage, useAuth } from "../features/auth";
import { AdminLayout } from "./layout/AdminLayout";
import { RouteErrorBoundary } from "../shared/errors";

const DashboardPage = lazy(() =>
  import("../features/dashboard").then((module) => ({ default: module.DashboardPage })),
);
const StudentsPage = lazy(() =>
  import("../features/students").then((module) => ({ default: module.StudentsPage })),
);
const ChatPage = lazy(() =>
  import("../features/chat").then((module) => ({ default: module.ChatPage })),
);
const NotificationsPage = lazy(() =>
  import("../features/notifications").then((module) => ({ default: module.NotificationsPage })),
);
const ReportsPage = lazy(() =>
  import("../features/reports").then((module) => ({ default: module.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import("../features/settings").then((module) => ({ default: module.SettingsPage })),
);
const LivePage = lazy(() =>
  import("../features/live").then((module) => ({ default: module.LivePage })),
);
const SystemPage = lazy(() =>
  import("../features/system").then((module) => ({ default: module.SystemPage })),
);
const FollowUpPage = lazy(() =>
  import("../features/followup").then((module) => ({ default: module.FollowUpPage })),
);
const OrganizationsPage = lazy(() =>
  import("../features/access").then((module) => ({ default: module.OrganizationsPage })),
);
const UsersPage = lazy(() =>
  import("../features/access").then((module) => ({ default: module.UsersPage })),
);
const PlannerPage = lazy(() =>
  import("../features/planner").then((module) => ({ default: module.PlannerPage })),
);
const LearningPage = lazy(() =>
  import("../features/learning").then((module) => ({ default: module.LearningPage })),
);
const ExamsPage = lazy(() =>
  import("../features/exams").then((module) => ({ default: module.ExamsPage })),
);
const QuestionsPage = lazy(() =>
  import("../features/questions").then((module) => ({ default: module.QuestionsPage })),
);
const QuizzesPage = lazy(() =>
  import("../features/quizzes").then((module) => ({ default: module.QuizzesPage })),
);
const SubjectsPage = lazy(() =>
  import("../features/subjects").then((module) => ({ default: module.SubjectsPage })),
);

function RouteScreen({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

function RouteLoading() {
  return (
    <div role="status" className="grid gap-3" aria-label="در حال آماده‌سازی صفحه">
      <div className="h-14 animate-pulse rounded-lg bg-white dark:bg-slate-900" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-lg bg-white dark:bg-slate-900" />
        ))}
      </div>
      <div className="h-[50vh] animate-pulse rounded-lg bg-white dark:bg-slate-900" />
    </div>
  );
}

function ProtectedRoute() {
  const auth = useAuth();
  if (auth.status === "checking")
    return (
      <div className="grid min-h-screen place-items-center bg-paper p-4">
        <div className="grid max-w-md gap-4 rounded-xl border bg-white p-6 text-center shadow-sm">
          <div
            className="mx-auto size-9 animate-spin rounded-full border-4 border-slate-200 border-t-brand"
            aria-hidden="true"
          />
          <div>
            <p className="font-bold text-slate-800">در حال بازیابی نشست…</p>
            <p className="mt-2 text-sm text-slate-500">{auth.message}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="soft" onClick={() => void auth.restore()}>
              <RefreshCw size={16} /> تلاش دوباره
            </Button>
            <Button variant="ghost" onClick={auth.stopRestore}>
              رفتن به صفحه ورود
            </Button>
          </div>
        </div>
      </div>
    );
  if (auth.status !== "authenticated") return <Navigate to="/login" replace />;
  return <Outlet />;
}

function CommunicationRedirect({ page }: { page: "live" | "chat" | "notifications" }) {
  const location = useLocation();
  return <Navigate to={`/admin/communication/${page}${location.search}${location.hash}`} replace />;
}

export function CapabilityRoute({
  capability,
  children,
}: {
  capability: string;
  children: ReactNode;
}) {
  const auth = useAuth();
  if (!auth.can(capability))
    return (
      <div
        role="alert"
        className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
      >
        <h2 className="font-bold">این ابزار در نقش فعال شما نیست</h2>
        <p className="mt-2 text-sm">
          از منوی حساب می‌توانید زمینه کاری را تغییر دهید یا به میز کار خود برگردید.
        </p>
        <a
          href="/admin"
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        >
          بازگشت به میز کار
        </a>
      </div>
    );
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  {
    path: "/admin",
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: (
              <RouteScreen>
                <DashboardPage />
              </RouteScreen>
            ),
          },
          { path: "live", element: <CommunicationRedirect page="live" /> },
          {
            path: "students",
            element: (
              <CapabilityRoute capability="students.read">
                <RouteScreen>
                  <StudentsPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "users",
            element: (
              <CapabilityRoute capability="users.read">
                <RouteScreen>
                  <UsersPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "organizations",
            element: (
              <CapabilityRoute capability="organization.read">
                <RouteScreen>
                  <OrganizationsPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "planner",
            element: (
              <CapabilityRoute capability="plans.read">
                <RouteScreen>
                  <PlannerPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "learning",
            element: (
              <CapabilityRoute capability="learning.read">
                <RouteScreen>
                  <LearningPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          { path: "education", element: <Navigate to="/admin/learning" replace /> },
          {
            path: "students/:studentId/learning",
            element: (
              <CapabilityRoute capability="learning.read">
                <RouteScreen>
                  <LearningPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "exams",
            element: (
              <CapabilityRoute capability="exams.read">
                <RouteScreen>
                  <ExamsPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "questions",
            element: (
              <CapabilityRoute capability="questions.read">
                <RouteScreen>
                  <QuestionsPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "quizzes",
            element: (
              <CapabilityRoute capability="quizzes.read">
                <RouteScreen>
                  <QuizzesPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          { path: "chat", element: <CommunicationRedirect page="chat" /> },
          { path: "notifications", element: <CommunicationRedirect page="notifications" /> },
          {
            path: "communication",
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="live" replace /> },
              {
                path: "live",
                element: (
                  <CapabilityRoute capability="student.live.read">
                    <RouteScreen>
                      <LivePage />
                    </RouteScreen>
                  </CapabilityRoute>
                ),
              },
              {
                path: "chat",
                element: (
                  <CapabilityRoute capability="chat.read">
                    <RouteScreen>
                      <ChatPage />
                    </RouteScreen>
                  </CapabilityRoute>
                ),
              },
              {
                path: "notifications",
                element: (
                  <RouteScreen>
                    <NotificationsPage />
                  </RouteScreen>
                ),
              },
            ],
          },
          {
            path: "follow-up",
            element: (
              <CapabilityRoute capability="recovery_requests.read">
                <RouteScreen>
                  <FollowUpPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "reports",
            element: (
              <CapabilityRoute capability="reports.read">
                <RouteScreen>
                  <ReportsPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "subjects",
            element: (
              <CapabilityRoute capability="subjects.read">
                <RouteScreen>
                  <SubjectsPage />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "system",
            element: (
              <CapabilityRoute capability="system.manage">
                <RouteScreen>
                  <SystemPage view="overview" />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "releases",
            element: (
              <CapabilityRoute capability="release.read">
                <RouteScreen>
                  <SystemPage view="releases" />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "database",
            element: (
              <CapabilityRoute capability="database.read">
                <RouteScreen>
                  <SystemPage view="database" />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "audit",
            element: (
              <CapabilityRoute capability="audit.read">
                <RouteScreen>
                  <SystemPage view="audit" />
                </RouteScreen>
              </CapabilityRoute>
            ),
          },
          {
            path: "settings",
            element: (
              <RouteScreen>
                <SettingsPage />
              </RouteScreen>
            ),
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/admin" replace /> },
]);
