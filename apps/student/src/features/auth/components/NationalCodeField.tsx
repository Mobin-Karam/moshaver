import { AlertCircle, CheckCircle2, IdCard } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  checkNationalCode,
  formatNationalCode,
  normalizeDigits,
  type NationalCodeResult,
} from "../libs/digits";

type NationalCodeFieldProps = {
  value: string; // raw digits, no dashes
  onChange(value: string): void;
  onBlur?(): void;
  /** Mark touched after first blur (or after submit attempt). */
  touched?: boolean;
  disabled?: boolean;
  /** Focus the next field automatically when 10 digits entered. */
  autoAdvance?: boolean;
  /** Optional id of the next element to focus on autoAdvance. */
  nextId?: string;
  /** Optional input name for form serialization. */
  name?: string;
};

const ERROR_TEXT: Record<
  Extract<NationalCodeResult, { state: "invalid" }>["reason"],
  string
> = {
  repeated: "کد ملی نمی‌تواند همه‌رقم یکسان باشد.",
  checksum: "کد ملی واردشده معتبر نیست. لطفاً بازبینی کنید.",
};

const FIELD_ID = "signup-national-code";
const HINT_ID = "signup-national-hint";
const COUNTER_ID = "signup-national-counter";
const ERROR_ID = "signup-national-error";

export function NationalCodeField({
  value,
  onChange,
  onBlur,
  touched = false,
  disabled = false,
  autoAdvance = true,
  nextId,
  name,
}: NationalCodeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const digits = normalizeDigits(value);
  const result = checkNationalCode(digits);

  const isComplete = digits.length === 10;
  const isValid = result.state === "valid";
  const isInvalid = result.state === "invalid";

  // Auto-advance when the code becomes valid and complete
  useEffect(() => {
    if (!autoAdvance || !isValid || !nextId) return;
    const next = document.getElementById(nextId);
    if (next) next.focus();
  }, [autoAdvance, isValid, nextId]);

  const describedBy = [
    HINT_ID,
    isComplete ? COUNTER_ID : null,
    isInvalid ? ERROR_ID : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`national-code-field${disabled ? " is-disabled" : ""}`}>
      <label htmlFor={FIELD_ID}>کد ملی</label>

      <div
        className={`student-login__field national-code-field__input${
          isInvalid ? " is-invalid" : ""
        }${isValid ? " is-valid" : ""}`}
      >
        <IdCard aria-hidden="true" />

        <input
          id={FIELD_ID}
          name={name}
          ref={inputRef}
          aria-label="کد ملی"
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          dir="ltr"
          lang="en"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="username"
          enterKeyHint="next"
          spellCheck={false}
          maxLength={12} /* 10 digits + 2 separators */
          disabled={disabled}
          value={formatNationalCode(digits)}
          onChange={(event) => {
            const next = normalizeDigits(event.target.value);
            onChange(next);
          }}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              const input = event.currentTarget;
              const pos = input.selectionStart ?? 0;
              const charBefore = input.value.charAt(pos - 1);
              if (charBefore === "-" && pos === input.selectionEnd) {
                event.preventDefault();
                const trimmed = digits.slice(0, Math.max(0, digits.length - 1));
                onChange(trimmed);
                requestAnimationFrame(() => {
                  const target = formatNationalCode(trimmed).length;
                  input.setSelectionRange(target, target);
                });
              }
            }
          }}
        />

        {isValid ? (
          <span className="national-code-field__check" aria-hidden>
            <CheckCircle2 size={18} />
          </span>
        ) : null}
      </div>

      {isComplete ? (
        <small
          id={COUNTER_ID}
          className={`national-code-field__counter${isValid ? " is-ok" : ""}`}
          role="status"
          aria-live="polite"
        >
          {isValid ? "کد ملی معتبر است." : "۱۰ رقم وارد شد؛ در حال بررسی…"}
        </small>
      ) : digits.length > 0 ? (
        <small
          id={COUNTER_ID}
          className="national-code-field__counter"
          role="status"
          aria-live="polite"
        >
          {digits.length} از ۱۰ رقم
        </small>
      ) : null}

      {isInvalid ? (
        <p id={ERROR_ID} className="national-code-field__error" role="alert">
          <AlertCircle size={14} aria-hidden />
          {result.state === "invalid"
            ? ERROR_TEXT[result.reason]
            : "کد ملی واردشده معتبر نیست."}
        </p>
      ) : (
        <small id={HINT_ID} className="national-code-field__hint">
          اعداد فارسی و عربی خودکار به انگلیسی تبدیل می‌شوند. کد ملی نام کاربری
          شماست.
        </small>
      )}
    </div>
  );
}
