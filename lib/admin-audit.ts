import "server-only";
import { prisma } from "@/lib/db";

export const ADMIN_AUDIT_ACTIONS = [
  "login_success",
  "login_failure",
  "password_reset_request",
  "password_reset_complete",
  "user_created",
  "user_updated",
  "logout",
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

export const ADMIN_AUDIT_ACTION_LABELS: Record<AdminAuditAction, string> = {
  login_success: "Giriş başarılı",
  login_failure: "Giriş başarısız",
  password_reset_request: "Şifre sıfırlama talebi",
  password_reset_complete: "Şifre sıfırlandı",
  user_created: "Kullanıcı oluşturuldu",
  user_updated: "Kullanıcı güncellendi",
  logout: "Çıkış",
};

export async function recordAdminAuditEvent(input: {
  action: AdminAuditAction | string;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await prisma.adminAuditEvent.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        email: (input.email ?? "").trim().toLowerCase(),
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (error) {
    console.error("[admin-audit] kayıt yazılamadı", error);
  }
}
