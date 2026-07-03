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

export async function getAdminUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
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
    },
  });
}
