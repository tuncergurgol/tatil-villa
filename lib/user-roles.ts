/** Client-safe user role labels/types (Prisma/DB bağımlılığı yok). */

export const USER_ROLE_OPTIONS = ["ADMIN", "SALES_REP"] as const;

export type AppUserRole = (typeof USER_ROLE_OPTIONS)[number];

export const USER_ROLE_LABELS: Record<AppUserRole, string> = {
  ADMIN: "Yönetici",
  SALES_REP: "Satış Temsilcisi",
};

export const USER_ROLE_DESCRIPTIONS: Record<AppUserRole, string> = {
  ADMIN: "Tüm yetkilere sahip",
  SALES_REP: "Şu an yetki yok, daha sonra yetkilendirme yapılacak",
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AppUserRole;
  active: boolean;
  salesCommissionRate: number;
  createdAt: string;
};
