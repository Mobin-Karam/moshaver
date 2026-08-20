export type OptionLetter = 'a' | 'b' | 'c' | 'd';

export function normalizeOption(value: string | null | undefined): OptionLetter | null {
  return value === 'a' || value === 'b' || value === 'c' || value === 'd' ? value : null;
}
