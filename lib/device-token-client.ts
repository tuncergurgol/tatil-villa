const STORAGE_KEY = "tv_did";
const TOKEN_PATTERN = /^[a-f0-9]{32}$/;

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)?.trim().toLowerCase() ?? "";
    if (TOKEN_PATTERN.test(existing)) return existing;
    const token = randomToken();
    window.localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    return "";
  }
}
