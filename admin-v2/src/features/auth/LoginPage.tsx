import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  LockKeyhole,
  RefreshCw,
  Server,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Card, Field, Input } from "../../components/ui";
import { api, getBackendTargetUrl, request } from "../../services/api";
import { useAuth } from "./AuthProvider";

const schema = z.object({
  username: z.string().trim().min(1, "نام کاربری لازم است"),
  password: z.string().min(1, "رمز عبور لازم است"),
});
type LoginForm = z.infer<typeof schema>;
type Health = { status?: string; version?: string };

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [health, setHealth] = useState<{
    loading: boolean;
    data?: Health;
    error?: string;
  }>({ loading: true });
  const { register, handleSubmit, formState, setValue } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });
  async function checkHealth() {
    setHealth({ loading: true });
    try {
      setHealth({
        loading: false,
        data: await request<Health>("GET", "/health", undefined, {
          suppressAuthFailure: true,
        }),
      });
    } catch {
      setHealth({ loading: false, error: "این بک‌اند در دسترس نیست." });
    }
  }
  useEffect(() => {
    void checkHealth();
  }, []);
  if (auth.status === "authenticated") return <Navigate to="/admin" replace />;
  const checking = auth.status === "checking" || auth.status === "logging-out";
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-4">
      <Card className="w-full max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-brand text-white">
            <LockKeyhole />
          </span>
          <div>
            <p className="text-xs font-bold tracking-widest text-brand">
              MOSHAVER ADVISOR
            </p>
            <h1 className="text-xl font-black">Moshaver | مشاور</h1>
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          برنامه‌ریزی، آزمون، فعالیت زنده و تحلیل دانش‌آموز با نشست امن.
        </p>
        <div
          className={`mb-4 flex items-center gap-2 rounded-md border p-3 text-xs ${health.error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          {health.loading ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : health.error ? (
            <WifiOff size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span className="min-w-0 flex-1 truncate">
            {health.loading
              ? "در حال بررسی اتصال…"
              : health.error ||
                `اتصال برقرار است • نسخه ${health.data?.version || "—"}`}
          </span>
          <button
            type="button"
            aria-label="بررسی دوباره اتصال"
            onClick={() => void checkHealth()}
          >
            <RefreshCw size={15} />
          </button>
        </div>
        {import.meta.env.DEV ? (
          <p
            className="mb-4 flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs text-slate-500"
            dir="ltr"
          >
            <Server size={14} />
            {getBackendTargetUrl()}
          </p>
        ) : null}
        <form
          className="grid gap-4"
          onSubmit={handleSubmit(async (data) => {
            setError("");
            try {
              await auth.login(data.username, data.password);
              navigate("/admin");
            } catch (e) {
              setError(e instanceof Error ? e.message : "ورود ناموفق بود");
            }
          })}
        >
          <Field label="نام کاربری" error={formState.errors.username?.message}>
            <Input
              autoComplete="username"
              disabled={checking}
              {...register("username")}
            />
          </Field>
          <Field label="رمز عبور" error={formState.errors.password?.message}>
            <div className="relative">
              <Input
                className="pl-11"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={checking}
                {...register("password")}
              />
              <button
                type="button"
                className="absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-500"
                aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
          {import.meta.env.DEV ? (
            <div className="rounded-md border border-dashed p-3">
              <span className="text-xs text-slate-500">
                رمزهای آماده محیط توسعه
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Admin123456!", "anonymous"].map((password) => (
                  <button
                    key={password}
                    type="button"
                    className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs"
                    onClick={() => {
                      setValue("password", password);
                      void navigator.clipboard?.writeText(password);
                    }}
                  >
                    <Clipboard size={13} />
                    {password}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {auth.message || error ? (
            <p
              role="alert"
              className={`rounded-md p-3 text-sm ${checking && !error ? "bg-sky-50 text-sky-800" : "bg-rose-50 text-rosewood"}`}
            >
              {error || auth.message}
            </p>
          ) : null}
          <Button disabled={checking || formState.isSubmitting}>
            {checking
              ? "در حال بازیابی نشست…"
              : formState.isSubmitting
                ? "در حال ورود…"
                : "ورود"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
