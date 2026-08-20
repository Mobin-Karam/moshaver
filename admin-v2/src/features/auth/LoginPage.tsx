import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Card, Field, Input } from "../../components/ui";
import { useAuth } from "./AuthProvider";

const schema = z.object({ username: z.string().min(1, "نام کاربری لازم است"), password: z.string().min(1, "رمز عبور لازم است") });
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<LoginForm>({ resolver: zodResolver(schema) });
  if (auth.status === "authenticated") return <Navigate to="/admin" replace />;
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-brand text-white"><LockKeyhole /></span>
          <div><h1 className="text-xl font-bold">ورود مشاور</h1><p className="text-sm text-slate-500">نشست با کوکی امن و CSRF برقرار می‌شود.</p></div>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit(async (data) => { setError(""); try { await auth.login(data.username, data.password); navigate("/admin"); } catch (e) { setError(e instanceof Error ? e.message : "ورود ناموفق بود"); } })}>
          <Field label="نام کاربری" error={formState.errors.username?.message}><Input autoComplete="username" {...register("username")} /></Field>
          <Field label="رمز عبور" error={formState.errors.password?.message}><Input type="password" autoComplete="current-password" {...register("password")} /></Field>
          {error ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rosewood">{error}</p> : null}
          <Button disabled={formState.isSubmitting}>{formState.isSubmitting ? "در حال ورود..." : "ورود"}</Button>
        </form>
      </Card>
    </main>
  );
}
