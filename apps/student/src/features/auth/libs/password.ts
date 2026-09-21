/** Returns true if the value contains any character outside printable ASCII (space–~). */
export function containsNonEnglishPasswordCharacters(value: string): boolean {
  return /[^\x20-\x7E]/.test(value);
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  percent: number;
  label: string;
};

const LABELS: Record<PasswordStrengthLevel, string> = {
  weak: 'ضعیف',
  fair: 'متوسط',
  good: 'خوب',
  strong: 'قوی',
};

/**
 * Scores a password from 0–5 based on length, case mix, digits and symbols.
 * Returns a level, a 0–100 percent for the meter, and a Persian label.
 */
export function passwordStrength(value: string): PasswordStrength {
  if (!value) return { level: 'weak', percent: 0, label: '' };

  let score = 0;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const level: PasswordStrengthLevel =
    score <= 1 ? 'weak' : score === 2 ? 'fair' : score === 3 ? 'good' : 'strong';

  return {
    level,
    percent: Math.min(100, 20 + score * 16),
    label: LABELS[level],
  };
}