import { PasswordStrength } from "../libs/password";


export function PasswordStrengthMeter({ strength }: { strength: PasswordStrength}) {
  if (!strength.label) return null;

  return (
    <div className="signup-strength" aria-live="polite">
      <div className="signup-strength__track">
        <span
          className={`signup-strength__bar is-${strength.level}`}
          style={{ inlineSize: `${strength.percent}%` }}
        />
      </div>
      <span className={`signup-strength__label is-${strength.level}`}>{strength.label}</span>
    </div>
  );
}