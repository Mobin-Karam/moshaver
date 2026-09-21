import {
  CheckCircle2,
  LoaderCircle,
  UserPlus,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { apiClient } from "../../services/api-client";
import { PasswordInput } from "./PasswordInput";

import { useSignupOptions } from "./hooks/useSignupOptions";
import { useSignupBooks } from "./hooks/useSignupBooks";
import { FormState, INITIAL_FORM, Touched } from "./model/types";
import {
  containsNonEnglishPasswordCharacters,
  passwordStrength,
} from "./libs/password";
import { validNationalCode } from "./libs/digits";
import { SignupStepper } from "./components/SignupStepper";
import { PasswordStrengthMeter } from "./components/PasswordStrengthMeter";
import { BooksPreview } from "./components/BooksPreview";
import { FieldSelect } from "./components/FieldSelect";
import { NationalCodeField } from "./components/NationalCodeField";

type Step = 1 | 2 | 3;

export function SignupForm({ onLogin }: { onLogin(): void }) {
  const {
    options,
    status: optionsStatus,
    error: optionsError,
    setError: setOptionsError,
  } = useSignupOptions();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [touched, setTouched] = useState<Touched>({});
  const [status, setStatus] = useState<"ready" | "saving" | "done">("ready");
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>(1);
  /** Prevents re-triggering auto-advance for the same section. */
  const advancedRef = useRef<Step | null>(null);

  const sectionRef = useRef<HTMLDivElement>(null);

  const books = useSignupBooks({
    grade: form.grade,
    educationTypeId: form.educationTypeId,
    trackId: form.trackId,
  });

  const structure = useMemo(
    () =>
      options?.gradeStructure.find((item) =>
        item.grades.includes(Number(form.grade)),
      ),
    [options, form.grade],
  );
  const educationTypes = useMemo(
    () =>
      options?.educationTypes.filter((item) =>
        structure?.education_type_ids.includes(item.id),
      ) || [],
    [options, structure],
  );
  const tracks = useMemo(() => {
    if (form.educationTypeId === "theoretical")
      return options?.theoreticalTracks || [];
    if (["technical_vocational", "kar_danesh"].includes(form.educationTypeId))
      return options?.vocationalFields || [];
    return [];
  }, [options, form.educationTypeId]);

  const hasNonEnglishChars =
    containsNonEnglishPasswordCharacters(form.password) ||
    containsNonEnglishPasswordCharacters(form.confirm);
  const nationalCodeValid = validNationalCode(form.nationalCode);
  const strength = passwordStrength(form.password);
  const passwordsMatch =
    form.confirm.length > 0 &&
    form.password === form.confirm &&
    !hasNonEnglishChars;
  const passwordsMismatch =
    Boolean(touched.confirm) &&
    form.confirm.length > 0 &&
    form.password !== form.confirm;

  // --- Per-section validity ---
  const identityValid = useMemo(
    () =>
      form.firstName.trim().length >= 1 &&
      form.lastName.trim().length >= 1 &&
      nationalCodeValid,
    [form.firstName, form.lastName, nationalCodeValid],
  );

  const educationValid = useMemo(
    () =>
      Boolean(
        form.grade &&
        form.educationTypeId &&
        (!structure?.track_required || form.trackId),
      ),
    [form.grade, form.educationTypeId, form.trackId, structure?.track_required],
  );

  const passwordValid = useMemo(
    () =>
      form.password.length >= 12 &&
      !hasNonEnglishChars &&
      form.password === form.confirm,
    [form.password, form.confirm, hasNonEnglishChars],
  );

  const sectionValid: Record<Step, boolean> = {
    1: identityValid,
    2: educationValid,
    3: passwordValid,
  };

  const valid = identityValid && educationValid && passwordValid;

  // --- Auto-advance when a section becomes valid ---
  useEffect(() => {
    if (step === 3) return;
    if (!sectionValid[step]) return;
    if (advancedRef.current === step) return;

    advancedRef.current = step;
    const timer = window.setTimeout(() => {
      setStep((current) => (current === step ? ((step + 1) as Step) : current));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [step, sectionValid[step]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the auto-advance guard when a user returns to a prior step
  useEffect(() => {
    if (step === 1) advancedRef.current = null;
  }, [step]);

  // Focus the section heading on step change for screen readers
  useEffect(() => {
    sectionRef.current?.focus();
  }, [step]);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
    if (optionsError) setOptionsError("");
  }

  function blur(key: keyof FormState) {
    setTouched((current) => ({ ...current, [key]: true }));
  }

  function changeGrade(value: string) {
    const next = options?.gradeStructure.find((item) =>
      item.grades.includes(Number(value)),
    );
    const autoType =
      next?.education_type_ids.length === 1 ? next.education_type_ids[0] : "";
    setForm((current) => ({
      ...current,
      grade: value,
      educationTypeId: autoType,
      trackId: "",
    }));
  }

  function goTo(target: Step) {
    // Only allow going to a step that is reachable
    if (target === 1) return setStep(1);
    if (target === 2 && identityValid) return setStep(2);
    if (target === 3 && identityValid && educationValid) return setStep(3);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      nationalCode: true,
      password: true,
      confirm: true,
      grade: true,
      educationTypeId: true,
      trackId: true,
    });
    if (!valid) {
      setError("اطلاعات هویتی و تحصیلی را کامل و درست وارد کنید.");
      // Jump back to the first invalid section
      if (!identityValid) return setStep(1);
      if (!educationValid) return setStep(2);
      return setStep(3);
    }
    setStatus("saving");
    try {
      await apiClient.request(
        "POST",
        "/onboarding/student-signup",
        {
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          nationalCode: form.nationalCode,
          password: form.password,
          grade: Number(form.grade),
          educationTypeId: form.educationTypeId,
          trackId: form.trackId || undefined,
        },
        { skipSyncQueue: true },
      );
      setStatus("done");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "ساخت حساب ناموفق بود.",
      );
      setStatus("ready");
    }
  }

  if (status === "done") {
    return (
      <div className="student-signup__success" role="status" aria-live="polite">
        <CheckCircle2 />
        <h2>حساب ساخته شد</h2>
        <p>
          نام کاربری شما همان کد ملی است. پس از ورود، تخصیص مشاور و سازمان
          پیگیری می‌شود.
        </p>
        <button
          type="button"
          className="student-login__submit"
          onClick={onLogin}
        >
          رفتن به ورود
        </button>
      </div>
    );
  }

  const isBusy = status === "saving" || optionsStatus === "loading";
  const globalError = optionsError || error;
  const canContinue = sectionValid[step];
  const isLast = step === 3;

  return (
    <form
      className="student-login__card student-signup"
      onSubmit={(event) => void submit(event)}
      noValidate
      aria-busy={isBusy}
    >
      <header>
        <span aria-hidden="true">
          <UserPlus />
        </span>
        <div>
          <h2>ساخت حساب دانش‌آموز</h2>
          <p>سال تحصیلی {options?.schoolYear || "۱۴۰۵–۱۴۰۶"}</p>
        </div>
      </header>

      <SignupStepper step={step} onSelect={goTo} />

      {optionsStatus === "loading" ? (
        <p role="status" aria-live="polite" className="signup-status">
          <LoaderCircle className="spin" size={16} aria-hidden /> در حال دریافت
          پایه‌ها…
        </p>
      ) : null}

      <div
        ref={sectionRef}
        tabIndex={-1}
        className="signup-section"
        aria-live="polite"
        aria-labelledby={`signup-section-title-${step}`}
      >
        <h3
          id={`signup-section-title-${step}`}
          className="signup-section__title"
        >
          {step === 1 && "اطلاعات هویتی"}
          {step === 2 && "اطلاعات تحصیلی"}
          {step === 3 && "رمز عبور"}
        </h3>
        <p className="signup-section__subtitle">
          {step === 1 && "نام و کد ملی خود را وارد کنید."}
          {step === 2 && "پایه، نوع آموزش و رشته خود را انتخاب کنید."}
          {step === 3 && "یک رمز عبور امن برای حساب خود بسازید."}
        </p>
      </div>

      {/* ── Step 1: Identity ───────────────────────────── */}
      {step === 1 ? (
        <>
          <div className="student-signup__grid">
            <label
              className={
                touched.firstName && !form.firstName.trim() ? "is-invalid" : ""
              }
            >
              نام
              <input
                aria-label="نام"
                aria-invalid={touched.firstName && !form.firstName.trim()}
                value={form.firstName}
                maxLength={79}
                autoComplete="given-name"
                enterKeyHint="next"
                autoFocus
                onChange={(e) => field("firstName", e.target.value)}
                onBlur={() => blur("firstName")}
              />
            </label>
            <label
              className={
                touched.lastName && !form.lastName.trim() ? "is-invalid" : ""
              }
            >
              نام خانوادگی
              <input
                aria-label="نام خانوادگی"
                aria-invalid={touched.lastName && !form.lastName.trim()}
                value={form.lastName}
                maxLength={79}
                autoComplete="family-name"
                enterKeyHint="next"
                onChange={(e) => field("lastName", e.target.value)}
                onBlur={() => blur("lastName")}
              />
            </label>
          </div>

          <NationalCodeField
            value={form.nationalCode}
            onChange={(value) => field("nationalCode", value)}
            onBlur={() => blur("nationalCode")}
            touched={Boolean(touched.nationalCode)}
            nextId="signup-grade-select"
          />
        </>
      ) : null}

      {/* ── Step 2: Education ──────────────────────────── */}
      {step === 2 ? (
        <>
          <div className="student-signup__grid">
            <FieldSelect
              label="پایه"
              ariaLabel="پایه"
              value={form.grade}
              invalid={Boolean(touched.grade && !form.grade)}
              placeholder="انتخاب پایه"
              options={options?.grades ?? []}
              onChange={changeGrade}
              onBlur={() => blur("grade")}
            />

            <FieldSelect
              label="نوع آموزش"
              ariaLabel="نوع آموزش"
              value={form.educationTypeId}
              invalid={Boolean(
                touched.educationTypeId && !form.educationTypeId,
              )}
              disabled={!form.grade}
              placeholder="انتخاب نوع"
              options={educationTypes}
              onChange={(value) => {
                field("educationTypeId", value);
                field("trackId", "");
              }}
              onBlur={() => blur("educationTypeId")}
            />
          </div>

          {structure?.track_required ? (
            <FieldSelect
              label="رشته"
              ariaLabel="رشته"
              value={form.trackId}
              invalid={Boolean(touched.trackId && !form.trackId)}
              disabled={!form.educationTypeId}
              placeholder="انتخاب رشته"
              options={tracks}
              onChange={(value) => field("trackId", value)}
              onBlur={() => blur("trackId")}
            />
          ) : null}

          {form.grade ? <BooksPreview books={books} /> : null}
        </>
      ) : null}

      {/* ── Step 3: Password ───────────────────────────── */}
      {step === 3 ? (
        <>
          <PasswordInput
            label="رمز عبور"
            ariaLabel="رمز عبور جدید"
            value={form.password}
            autoComplete="new-password"
            invalid={hasNonEnglishChars}
            describedBy={
              hasNonEnglishChars
                ? "signup-password-language-warning"
                : undefined
            }
            hint="حداقل ۱۲ نویسه"
            onChange={(value) => field("password", value)}
            after={
              form.password ? (
                <PasswordStrengthMeter strength={strength} />
              ) : null
            }
          />

          <PasswordInput
            label="تکرار رمز عبور"
            value={form.confirm}
            autoComplete="new-password"
            invalid={passwordsMismatch || hasNonEnglishChars}
            describedBy={
              hasNonEnglishChars
                ? "signup-password-language-warning"
                : undefined
            }
            onChange={(value) => field("confirm", value)}
            onBlur={() => blur("confirm")}
          />

          {passwordsMatch ? (
            <p className="signup-hint is-ok" role="status">
              <CheckCircle2 size={14} aria-hidden /> رمزهای عبور یکسان هستند.
            </p>
          ) : null}
          {passwordsMismatch ? (
            <p className="signup-hint is-error" role="alert">
              <AlertCircle size={14} aria-hidden /> رمزهای عبور یکسان نیستند.
            </p>
          ) : null}

          {hasNonEnglishChars ? (
            <p
              id="signup-password-language-warning"
              className="student-login__error"
              role="alert"
            >
              برای نوشتن رمز عبور، زبان صفحه‌کلید را به انگلیسی تغییر دهید.
            </p>
          ) : null}
        </>
      ) : null}

      {globalError ? (
        <p className="student-login__error" role="alert">
          {globalError}
        </p>
      ) : null}

      {/* ── Navigation ─────────────────────────────────── */}
      <div className="signup-nav">
        {step > 1 ? (
          <button
            type="button"
            className="signup-nav__back"
            onClick={() => setStep((s) => (s - 1) as Step)}
          >
            <ChevronRight size={16} aria-hidden />
            بازگشت
          </button>
        ) : (
          <span aria-hidden />
        )}

        {!isLast ? (
          <button
            type="button"
            className="student-login__submit signup-nav__next"
            disabled={!canContinue}
            onClick={() => {
              setTouched((current) => {
                if (step === 1)
                  return {
                    ...current,
                    firstName: true,
                    lastName: true,
                    nationalCode: true,
                  };
                if (step === 2)
                  return {
                    ...current,
                    grade: true,
                    educationTypeId: true,
                    trackId: true,
                  };
                return current;
              });
              if (canContinue) setStep((s) => (s + 1) as Step);
            }}
          >
            <span>ادامه</span>
            <ChevronLeft size={16} aria-hidden />
          </button>
        ) : (
          <button
            className="student-login__submit signup-nav__next"
            type="submit"
            disabled={isBusy}
            aria-disabled={!valid || isBusy}
            title={
              !valid ? "برای فعال‌شدن، همه فیلدها را کامل کنید." : undefined
            }
          >
            {status === "saving" ? (
              <LoaderCircle className="spin" aria-hidden />
            ) : (
              <UserPlus aria-hidden />
            )}
            <span>
              {status === "saving" ? "در حال ساخت حساب…" : "ساخت حساب"}
            </span>
          </button>
        )}
      </div>

      <p className="signup-privacy">
        <ShieldCheck size={14} aria-hidden />
        اطلاعات شما فقط برای ساخت حساب تحصیلی استفاده می‌شود.
      </p>
    </form>
  );
}
