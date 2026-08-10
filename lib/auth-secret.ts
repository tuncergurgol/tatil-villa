/** Auth.js v5: AUTH_SECRET; geriye dönük: NEXTAUTH_SECRET */
export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}
