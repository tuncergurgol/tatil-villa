import "server-only";
import { prisma } from "@/lib/db";
import {
  ADMIN_AUDIT_ACTION_LABELS,
  type AdminAuditAction,
} from "@/lib/admin-audit";

export type SecurityAuditItem = {
  id: string;
  action: string;
  actionLabel: string;
  email: string;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  meta: unknown;
};

export type SecurityPageData = {
  summary: {
    activeAdmins: number;
    passiveUsers: number;
    loginSuccess24h: number;
    loginFailure24h: number;
    passwordReset24h: number;
    smsOtpEnabled: boolean;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    createdAt: Date;
  }>;
  events: SecurityAuditItem[];
  passwordResets: Array<{
    id: string;
    phone: string;
    channel: string;
    createdAt: Date;
    expiresAt: Date;
    usedAt: Date | null;
  }>;
};

function labelFor(action: string): string {
  return (
    ADMIN_AUDIT_ACTION_LABELS[action as AdminAuditAction] ?? action
  );
}

export async function getSecurityPageData(): Promise<SecurityPageData> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    activeAdmins,
    passiveUsers,
    loginSuccess24h,
    loginFailure24h,
    passwordReset24h,
    company,
    users,
    events,
    passwordResets,
  ] = await Promise.all([
    prisma.user.count({ where: { active: true, role: "ADMIN" } }),
    prisma.user.count({ where: { active: false } }),
    prisma.adminAuditEvent.count({
      where: { action: "login_success", createdAt: { gte: since } },
    }),
    prisma.adminAuditEvent.count({
      where: { action: "login_failure", createdAt: { gte: since } },
    }),
    prisma.verificationCode.count({
      where: {
        purpose: "admin_password_reset",
        createdAt: { gte: since },
      },
    }),
    prisma.companySettings.findUnique({
      where: { id: "default" },
      select: { smsOtpEnabled: true },
    }),
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      take: 50,
    }),
    prisma.adminAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.verificationCode.findMany({
      where: { purpose: "admin_password_reset" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        phone: true,
        channel: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
      },
    }),
  ]);

  return {
    summary: {
      activeAdmins,
      passiveUsers,
      loginSuccess24h,
      loginFailure24h,
      passwordReset24h,
      smsOtpEnabled: Boolean(company?.smsOtpEnabled),
    },
    users,
    events: events.map((event) => ({
      id: event.id,
      action: event.action,
      actionLabel: labelFor(event.action),
      email: event.email,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      createdAt: event.createdAt,
      meta: event.meta,
    })),
    passwordResets,
  };
}
