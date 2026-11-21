/** Yolcu360 search API yalnızca tam sayı komisyon kabul eder (%7,5 → %8). */
export function toYolcu360ApiCommissionPercentage(value: number): number {
  return Math.round(value);
}

export function parseCommissionPercentageInput(raw: unknown): number {
  const normalized = String(raw ?? "0")
    .trim()
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}
