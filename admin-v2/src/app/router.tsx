import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../shared/ui/ui";
import { LoginPage, useAuth } from "../features/auth";
import { AdminLayout } from "./layout/AdminLayout";
import { DashboardPage } from "../features/dashboard";
import { StudentsPage } from "../features/students";
import { ChatPage } from "../features/chat";
import { NotificationsPage } from "../features/notifications";
import { ReportsPage } from "../features/reports";
import { SettingsPage } from "../features/settings";
import { LivePage } from "../features/live";
import { SystemPage } from "../features/system";
import { FollowUpPage } from "../features/followup";

const PlannerPage = lazy(() => import("../features/planner").then((module) => ({ default: module.PlannerPage })));
const LearningPage = lazy(() => import("../features/learning").then((module) => ({ default: module.LearningPage })));
const ExamsPage = lazy(() => import("../features/exams").then((module) => ({ default: module.ExamsPage })));
const QuestionsPage = lazy(() => import("../features/questions").then((module) => ({ default: module.QuestionsPage })));
const QuizzesPage = lazy(() => import("../features/quizzes").then((module) => ({ default: module.QuizzesPage })));
const SubjectsPage = lazy(() => import("../features/subjects").then((module) => ({ default: module.SubjectsPage })));

function EducationScreen({ children }: { children: ReactNode }) {
  return <Suspense fallback={<EducationLoading />}>{children}</Suspense>;
}

function EducationLoading() {
  return <div className="grid gap-3" aria-label="در حال آماده‌سازی فضای آموزشی"><div className="h-14 animate-pulse rounded-lg bg-white" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-white" />)}</div><div className="h-[50vh] animate-pulse rounded-lg bg-white" /></div>;
}

function ProtectedRoute() {
  const auth = useAuth();
  if (auth.status === "checking")
    return (
      <div className="grid min-h-screen place-items-center bg-paper p-4">
        <div className="grid max-w-md gap-4 rounded-xl border bg-white p-6 text-center shadow-sm">
          <div className="mx-auto size-9 animate-spin rounded-full border-4 border-slate-200 border-t-brand" aria-hidden="true" />
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

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/admin",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "live", element: <LivePage /> },
          { path: "students", element: <StudentsPage /> },
          { path: "planner", element: <EducationScreen><PlannerPage /></EducationScreen> },
          { path: "learning", element: <EducationScreen><LearningPage /></EducationScreen> },
          { path: "education", element: <Navigate to="/admin/learning" replace /> },
          { path: "students/:studentId/learning", element: <EducationScreen><LearningPage /></EducationScreen> },
          { path: "exams", element: <EducationScreen><ExamsPage /></EducationScreen> },
          { path: "questions", element: <EducationScreen><QuestionsPage /></EducationScreen> },
          { path: "quizzes", element: <EducationScreen><QuizzesPage /></EducationScreen> },
          { path: "chat", element: <ChatPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "follow-up", element: <FollowUpPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "subjects", element: <EducationScreen><SubjectsPage /></EducationScreen> },
          { path: "system", element: <SystemPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/admin" replace /> },
]);
