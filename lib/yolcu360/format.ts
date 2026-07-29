export function formatYolcu360Money(amount: number, currency = "TRY") {
  return `${(amount / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function buildYolcu360TrackingId() {
  return `TV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function getYolcu360BaseUrl(environment: string) {
  return environment === "production"
    ? "https://api.pro.yolcu360.com/api/v1"
    : "https://staging.api.pro.yolcu360.com/api/v1";
}
