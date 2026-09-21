import { GraduationCap, IdCard, Lock } from "lucide-react";

type Step = 1 | 2 | 3;

type Props = {
  step: Step;
  /** Called when a user clicks a step. Only reachable steps should navigate. */
  onSelect?(target: Step): void;
};

export function SignupStepper({ step, onSelect }: Props) {
  const items: Array<{ id: Step; label: string; icon: React.ReactNode }> = [
    { id: 1, label: "هویت", icon: <IdCard size={14} aria-hidden /> },
    { id: 2, label: "تحصیلی", icon: <GraduationCap size={14} aria-hidden /> },
    { id: 3, label: "رمز عبور", icon: <Lock size={14} aria-hidden /> },
  ];

  return (
    <ol className="signup-stepper" aria-label="مراحل ثبت‌نام">
      {items.map((item) => {
        const isCurrent = step === item.id;
        const isDone = step > item.id;
        const className = [
          isDone ? "is-done" : "",
          isCurrent ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <li key={item.id} aria-current={isCurrent ? "step" : undefined}>
            <button
              type="button"
              className={className}
              onClick={() => onSelect?.(item.id)}
              disabled={!onSelect}
              aria-label={`مرحله ${item.id}: ${item.label}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
