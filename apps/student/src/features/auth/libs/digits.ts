/** Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits. */
export function toAsciiDigits(value: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";

  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const faIndex = fa.indexOf(digit);
    if (faIndex !== -1) return String(faIndex);

    const arIndex = ar.indexOf(digit);
    if (arIndex !== -1) return String(arIndex);

    return digit;
  });
}

/**
 * Normalizes an Iranian national code input:
 * - converts Persian/Arabic-Indic digits to ASCII
 * - removes non-digit characters
 * - limits the result to 10 digits
 *
 * National codes must remain strings because leading zeros are valid.
 */
export function normalizeNationalCode(value: string): string {
  return toAsciiDigits(value).replace(/\D/g, "").slice(0, 10);
}

/** Backward-compatible alias. */
export function normalizeDigits(value: string): string {
  return normalizeNationalCode(value);
}

/** Formats a national code as XXX-XXX-XXXX. Safe for partial input. */
export function formatNationalCode(value: string): string {
  const digits = normalizeNationalCode(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export type NationalCodeInvalidReason = "repeated" | "checksum";

export type NationalCodeResult =
  | { state: "empty" }
  | { state: "incomplete"; length: number; remaining: number }
  | { state: "invalid"; reason: NationalCodeInvalidReason }
  | { state: "valid"; code: string };

/**
 * Validates an Iranian national code (کد ملی) using the OFFICIAL algorithm.
 *
 * Rules (confirmed by multiple independent sources including:
 * - Dart national_code_validator package [citation:5]
 * - Dart get_x_master package [citation:1]
 * - Dart pars_validator package [citation:10]
 * - NPM persian-national-id package [citation:2]
 * - NPM iran-national-code-validator package [citation:12]
 * - GitHub parsicore/IR-NationalCode [citation:6]
 * - GitHub farhadkazemian/Code_Meli_Checker [citation:19]):
 *
 * 1. Exactly 10 digits (leading zeros allowed)
 * 2. Not all-identical digits (e.g. 0000000000, 1111111111)
 * 3. The 10th digit must satisfy the weighted checksum:
 *    - Multiply first 9 digits by weights 10, 9, 8, 7, 6, 5, 4, 3, 2
 *    - remainder = sum % 11
 *    - expected = remainder < 2 ? remainder : 11 - remainder
 *    - 10th digit must equal expected
 *
 * IMPORTANT: This algorithm ONLY validates the mathematical structure.
 * It CANNOT determine if the code was actually issued by ثبت احوال.
 * Codes like `3220219039` pass this checksum and are treated as valid.
 *
 * To verify real identity, use:
 * - Shahkar (شاهکار) with a verified mobile number
 * - Electronic Civil Registry inquiry (استعلام الکترونیکی هویت انفرادی)
 */
export function checkNationalCode(value: string): NationalCodeResult {
  const code = normalizeNationalCode(value);

  if (code.length === 0) return { state: "empty" };
  if (code.length < 10) {
    return {
      state: "incomplete",
      length: code.length,
      remaining: 10 - code.length,
    };
  }

  // Rule 2: Reject all-identical digits
  if (/^(\d)\1{9}$/.test(code)) {
    return { state: "invalid", reason: "repeated" };
  }

  // Rule 3: Official weighted checksum algorithm
  // Weights from 10 down to 2 for the first 9 digits
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(code[i]) * (10 - i);
  }

  const remainder = sum % 11;
  const expected = remainder < 2 ? remainder : 11 - remainder;
  const actual = Number(code[9]);

  if (actual !== expected) {
    return { state: "invalid", reason: "checksum" };
  }

  return { state: "valid", code };
}

/** Simple boolean validator. */
export function validNationalCode(value: string): boolean {
  return checkNationalCode(value).state === "valid";
}
