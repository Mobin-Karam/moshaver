import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { useAuth } from "../features/auth/AuthProvider";
import { AdminLayout } from "./layout/AdminLayout";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { StudentsPage } from "../features/students/StudentsPage";
import { PlannerPage } from "../features/planner/PlannerPage";
import { ExamsPage } from "../features/exams/ExamsPage";
import { QuestionsPage } from "../features/questions/QuestionsPage";
import { ChatPage } from "../features/chat/ChatPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { LivePage } from "../features/live/LivePage";
import { SubjectsPage } from "../features/subjects/SubjectsPage";
import { SystemPage } from "../features/system/SystemPage";
import { QuizzesPage } from "../features/quizzes/QuizzesPage";

function ProtectedRoute() {
  const auth = useAuth();
  if (auth.status === "checking")
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-slate-500">
        در حال بازیابی نشست...
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
          { path: "planner", element: <PlannerPage /> },
          { path: "exams", element: <ExamsPage /> },
          { path: "questions", element: <QuestionsPage /> },
          { path: "quizzes", element: <QuizzesPage /> },
          { path: "chat", element: <ChatPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "subjects", element: <SubjectsPage /> },
          { path: "system", element: <SystemPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/admin" replace /> },
]);
