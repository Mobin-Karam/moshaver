const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function normalizeNationalCode(value: string) {
  return value.trim().replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = persianDigits.indexOf(digit);
    return String(persian >= 0 ? persian : arabicDigits.indexOf(digit));
  });
}

export function isValidIranianNationalCode(value: string) {
  const code = normalizeNationalCode(value);
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
  const sum = code.slice(0, 9).split("").reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
  const remainder = sum % 11;
  const expected = remainder < 2 ? remainder : 11 - remainder;
  return Number(code[9]) === expected;
}
