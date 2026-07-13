import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Yönetici",
  SALES_REP: "Satış Temsilcisi",
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: "Tüm yetkilere sahip",
  SALES_REP: "Şu an yetki yok, daha sonra yetkilendirme yapılacak",
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
  salesCommissionRate: number;
  createdAt: Date;
};

export type SalesRepOption = {
  id: string;
  name: string;
  salesCommissionRate: number;
};

export async function getAdminUsers(): Promise<AdminUserListItem[]> {
  return prisma.user.findMany({
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
