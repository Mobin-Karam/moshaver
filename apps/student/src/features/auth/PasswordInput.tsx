import { AlertTriangle, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useCallback, useId, useRef, useState, type FocusEvent } from 'react';

type PasswordInputProps = {
  label: string;
  ariaLabel?: string;
  value: string;
  onChange(value: string): void;
  /** Called on blur — useful for touched-state validation in parent forms. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  autoComplete: 'current-password' | 'new-password' | 'off';
  disabled?: boolean;
  /** Marks the field as invalid; affects both `aria-invalid` and visual state. */
  invalid?: boolean;
  /** Extra space-separated IDs to append to the internal `aria-describedby`. */
  describedBy?: string;
  /** Optional id of an element describing the error (renders `aria-errormessage`). */
  errorId?: string;
  /** Optional hint rendered below the input (small helper text). */
  hint?: string;
  /** Optional slot rendered between the field and the hint (e.g. strength meter). */
  after?: React.ReactNode;
  name?: string;
  placeholder?: string;
  /** Hide the leading lock icon (useful for confirm-password rows). */
  hideIcon?: boolean;
};

export function PasswordInput({
  label,
  ariaLabel,
  value,
  onChange,
  onBlur,
  autoComplete,
  disabled = false,
  invalid = false,
  describedBy,
  errorId,
  hint,
  after,
  name,
  placeholder,
  hideIcon = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const passwordId = useId();
  const capsLockId = `${passwordId}-capslock`;
  const hintId = hint ? `${passwordId}-hint` : undefined;
  const inputRef = useRef<HTMLInputElement>(null);

  /** Preserve caret position when toggling visibility — avoids jumping to end. */
  const toggleVisible = useCallback(() => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    setVisible((current) => !current);
    // Restore caret after React commits the new `type` attribute.
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      if (start !== null && end !== null) {
        try {
          input.setSelectionRange(start, end);
        } catch {
          /* Some browsers disallow setSelectionRange on password fields when hidden. */
        }
      }
    });
  }, []);

  const handleKeyEvent = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState === 'function') {
      setCapsLock(event.getModifierState('CapsLock'));
    }
  }, []);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setCapsLock(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  /** Compose aria-describedby from: caller IDs, caps-lock hint, internal hint. */
  const describedByIds = [describedBy, capsLock ? capsLockId : null, hintId]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={`student-password-input${disabled ? ' is-disabled' : ''}`}>
      <label htmlFor={passwordId}>{label}</label>

      <div
        className={`student-login__field${invalid ? ' is-invalid' : ''}${disabled ? ' is-disabled' : ''}`}
      >
        {!hideIcon ? <LockKeyhole aria-hidden="true" /> : <span aria-hidden="true" className="student-password-input__spacer" />}

        <input
          id={passwordId}
          ref={inputRef}
          name={name}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={describedByIds}
          aria-errormessage={invalid && errorId ? errorId : undefined}
          dir="ltr"
          lang="en"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={300}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          onBlur={handleBlur}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={toggleVisible}
          aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
          aria-pressed={visible}
          tabIndex={disabled ? -1 : 0}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>

      {capsLock && !disabled ? (
        <p id={capsLockId} className="student-password-input__warning" role="status" aria-live="polite">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>کلید Caps Lock روشن است.</span>
        </p>
      ) : null}

      {after}

      {hint ? (
        <small id={hintId} className="student-password-input__hint">
          {hint}
        </small>
      ) : null}
    </div>
  );
}