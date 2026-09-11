export function formatYolcu360Money(amount: number, currency = "TRY") {
  return `${(amount / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
