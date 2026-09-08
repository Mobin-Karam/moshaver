import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button, Field, Input } from "../../../shared/ui/ui";
import { useAuth } from "../hooks/useAuth";
import { loginSchema, type LoginFormValues } from "../model/login.schema";
import { DemoAccountPicker } from "./DemoAccountPicker";

export function LoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState, setValue } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const checking = auth.status === "checking" || auth.status === "logging-out";

  return (
    <form
      className="grid gap-5"
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
          className="h-12"
          autoComplete="username"
          disabled={checking}
          {...register("username")}
        />
      </Field>

      <Field label="رمز عبور" error={formState.errors.password?.message}>
        <div className="relative">
          <Input
            className="h-12 pl-11"
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
        <DemoAccountPicker
          onSelect={(username, password) => {
            setValue("username", username, { shouldValidate: true });
            setValue("password", password, { shouldValidate: true });
            setError("");
          }}
        />
      ) : null}

      {auth.message || error ? (
        <p
          role="alert"
          className={[
            "rounded-xl border p-3.5 text-sm",
            checking && !error ? "bg-sky-50 text-sky-800" : "bg-rose-50 text-rosewood",
          ].join(" ")}
        >
          {error || auth.message}
        </p>
      ) : null}

      <Button className="h-12 w-full text-[15px]" disabled={checking || formState.isSubmitting}>
        {checking ? "در حال بازیابی نشست…" : formState.isSubmitting ? "در حال ورود…" : "ورود"}
      </Button>
    </form>
  );
}
