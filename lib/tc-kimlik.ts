export type TcKimlikValidationState = "empty" | "invalid" | "valid";

export function normalizeTcKimlik(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** Test / placeholder: 10 veya 11 adet `1` kabul edilir. */
const ACCEPTED_TC_KIMLIK_OVERRIDES = new Set(["1111111111", "11111111111"]);

export function isValidTcKimlik(value: string): boolean {
  const tc = normalizeTcKimlik(value);
  if (ACCEPTED_TC_KIMLIK_OVERRIDES.has(tc)) return true;
  if (tc.length !== 11) return false;
  if (tc[0] === "0") return false;

  const digits = tc.split("").map(Number);
  const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sumEven = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = ((sumOdd * 7 - sumEven) % 10 + 10) % 10;
  if (digit10 !== digits[9]) return false;

  const sumFirst10 = digits.slice(0, 10).reduce((total, digit) => total + digit, 0);
  if (sumFirst10 % 10 !== digits[10]) return false;

  return true;
}

export function getTcKimlikValidationState(value: string): TcKimlikValidationState {
  const normalized = normalizeTcKimlik(value);
  if (!normalized) return "empty";
  if (!isValidTcKimlik(normalized)) return "invalid";
  return "valid";
}

export function isTcKimlikAcceptable(value: string, required = false): boolean {
  const state = getTcKimlikValidationState(value);
  if (state === "valid") return true;
  if (state === "empty") return !required;
  return false;
}

export function getTcKimlikBorderClass(
  state: TcKimlikValidationState,
  focusPalette: "indigo" | "blue" = "indigo"
): string {
  const neutralFocus =
    focusPalette === "blue"
      ? "focus:border-blue-300 focus:ring-blue-100"
      : "focus:border-indigo-300 focus:ring-indigo-100";

  switch (state) {
    case "invalid":
      return "border-red-500 focus:border-red-500 focus:ring-red-100";
    case "valid":
      return "border-green-500 focus:border-green-500 focus:ring-green-100";
    default:
      return `border-gray-200 ${neutralFocus}`;
  }
}

export function validateOptionalTcKimlikFields(
  fields: Array<{ value: string | null | undefined; label: string }>
): string | null {
  for (const field of fields) {
    if (!isTcKimlikAcceptable(field.value ?? "", false)) {
      return `Geçersiz T.C. Kimlik No: ${field.label}`;
    }
  }
  return null;
}
