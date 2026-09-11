import type { NextAuthConfig } from "next-auth";
import { getAuthSecret } from "@/lib/auth-secret";

/**
 * Edge/middleware-safe Auth.js config (no Prisma / Node-only imports).
 * Credentials provider lives in auth.ts so middleware does not pull in the DB client.
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    // 8 saat — idle panel oturumunu kısaltır
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  secret: getAuthSecret(),
} satisfies NextAuthConfig;
