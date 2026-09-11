/** Auth.js v5: AUTH_SECRET; geriye dönük: NEXTAUTH_SECRET */
export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/** Production HTTPS oturum çerezi `__Secure-authjs.session-token` kullanır. */
export function useSecureAuthCookies(): boolean {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  if (authUrl.startsWith("https://")) return true;
  return process.env.NODE_ENV === "production";
}
