import type { ReactNode } from 'react';

type Option = { id: string | number; fa: string | number };

type FieldSelectProps = {
  label: string;
  ariaLabel: string;
  value: string;
  invalid: boolean;
  disabled?: boolean;
  placeholder: string;
  options: readonly Option[];
  onChange(value: string): void;
  onBlur(): void;
};

export function FieldSelect({
  label,
  ariaLabel,
  value,
  invalid,
  disabled = false,
  placeholder,
  options,
  onChange,
  onBlur,
}: FieldSelectProps) {
  return (
    <label className={invalid ? 'is-invalid' : ''}>
      {label}
      <select
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={String(option.id)} value={String(option.id)}>
            {option.fa}
          </option>
        ))}
      </select>
    </label>
  );
}