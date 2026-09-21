import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export const DEVICE_TOKEN_COOKIE = "tv_did";
export const DEVICE_TOKEN_PATTERN = /^[a-f0-9]{32}$/;

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

export function normalizeDeviceToken(raw: unknown): string | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  return DEVICE_TOKEN_PATTERN.test(value) ? value : null;
}

export function createDeviceToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Tarayıcı MAC adresi web'den okunamaz. Bunun yerine kalıcı cihaz kimliği
 * (cookie + form alanı) kullanılır.
 */
export async function resolveRequestDeviceToken(
  formToken?: string | null
): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = normalizeDeviceToken(
    cookieStore.get(DEVICE_TOKEN_COOKIE)?.value
  );
  const fromForm = normalizeDeviceToken(formToken);
  const token = fromCookie || fromForm || createDeviceToken();

  if (fromCookie !== token) {
    cookieStore.set(DEVICE_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SEC,
    });
  }

  return token;
}
