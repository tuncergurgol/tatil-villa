import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AdminUserListItem, AppUserRole } from "@/lib/user-roles";

export type { AdminUserListItem, AppUserRole } from "@/lib/user-roles";
export {
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  USER_ROLE_OPTIONS,
} from "@/lib/user-roles";

export type SalesRepOption = {
  id: string;
  name: string;
  salesCommissionRate: number;
};

export async function getAdminUsers(): Promise<AdminUserListItem[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      salesCommissionRate: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as AppUserRole,
    active: user.active,
    salesCommissionRate: user.salesCommissionRate,
    createdAt: user.createdAt.toISOString(),
  }));
}

/** Rezervasyon formu — aktif kullanıcılar (satış temsilcisi seçimi) */
export async function getActiveSalesRepOptions(): Promise<SalesRepOption[]> {
  return prisma.user.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      salesCommissionRate: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getAdminUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      salesCommissionRate: true,
    },
  });
}

/** Prisma enum ile uyumluluk kontrolü (server-only) */
export function isUserRole(value: string): value is UserRole {
  return value === UserRole.ADMIN || value === UserRole.SALES_REP;
}
