import { LockKeyhole } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Card } from "../../../shared/ui/ui";
import { DevBackendSwitcher } from "../../../app/dev/DevBackendSwitcher";
import { BackendHealthStatus } from "../components/BackendHealthStatus";
import { LoginForm } from "../components/LoginForm";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const auth = useAuth();

  if (auth.status === "authenticated") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-4">
      <Card className="w-full max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-brand text-white">
            <LockKeyhole />
          </span>

          <div>
            <p className="text-xs font-bold tracking-widest text-brand">MOSHAVER PORTAL</p>

            <h1 className="text-xl font-black">Moshaver | مشاور</h1>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          درگاه امن خانواده، مشاوران، دبیران و مدیران برای پیگیری آموزش و عملیات.
        </p>

        <BackendHealthStatus />

        <div className="mb-4 flex min-w-0 justify-end">
          <DevBackendSwitcher />
        </div>

        <LoginForm />
      </Card>
    </main>
  );
}
