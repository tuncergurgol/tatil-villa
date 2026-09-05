import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { recordAdminAuditEvent } from "@/lib/admin-audit";

async function requestAuditContext() {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for")?.trim() ?? "";
    const ip =
      (forwarded ? forwarded.split(",")[0]?.trim() : "") ||
      h.get("x-real-ip")?.trim() ||
      h.get("cf-connecting-ip")?.trim() ||
      null;
    const userAgent = h.get("user-agent");
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        const { ip, userAgent } = await requestAuditContext();

        if (!credentials?.email || !credentials?.password) {
          await recordAdminAuditEvent({
            action: "login_failure",
            email: String(credentials?.email ?? ""),
            ip,
            userAgent,
            meta: { reason: "missing_credentials" },
          });
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();

        const rate = checkRateLimit({
          key: `login:${email}`,
          limit: 8,
          windowMs: 15 * 60 * 1000,
        });
        if (!rate.ok) {
          await recordAdminAuditEvent({
            action: "login_failure",
            email,
            ip,
            userAgent,
            meta: { reason: "rate_limited" },
          });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.active) {
          await recordAdminAuditEvent({
            action: "login_failure",
            email,
            ip,
            userAgent,
            meta: { reason: !user ? "unknown_user" : "inactive" },
          });
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) {
          await recordAdminAuditEvent({
            action: "login_failure",
            userId: user.id,
            email,
            ip,
            userAgent,
            meta: { reason: "bad_password" },
          });
          return null;
        }

        resetRateLimit(`login:${email}`);

        await recordAdminAuditEvent({
          action: "login_success",
          userId: user.id,
          email: user.email,
          ip,
          userAgent,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
