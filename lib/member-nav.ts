import type { LucideIcon } from "lucide-react";
import {
  Gift,
  Heart,
  Home,
  KeyRound,
  Ticket,
  UserRound,
} from "lucide-react";

export const MEMBER_HUB_PATH = "/uye/hesabim";

export type MemberNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  external?: boolean;
};

export const memberAccountNavItems: MemberNavItem[] = [
  {
    href: "/uye/hesabim/profil",
    label: "Kişisel Bilgiler",
    icon: UserRound,
    description: "Profil ve iletişim",
  },
  {
    href: "/uye/hesabim/rezervasyonlar",
    label: "Rezervasyonlarım",
    icon: Ticket,
    description: "Geçmiş ve aktif",
  },
  {
    href: "/uye/hesabim/begendiklerim",
    label: "Beğendiklerim",
    icon: Heart,
    description: "Favori villalar",
  },
  {
    href: "/uye/hesabim/uyelik",
    label: "Üyelik Sınıfı",
    icon: Gift,
    description: "Sadakat ve çekler",
  },
  {
    href: "/uye/hesabim/davet",
    label: "Davet Kodu",
    icon: KeyRound,
    description: "Arkadaşını davet et",
  },
];

export const memberHomeNavItem: MemberNavItem = {
  href: "/",
  label: "Ana Sayfa",
  icon: Home,
  external: true,
};

export function getMemberPageTitle(pathname: string): string | null {
  if (pathname === MEMBER_HUB_PATH) return "Hesabım";
  const item = memberAccountNavItems.find((entry) => entry.href === pathname);
  return item?.label ?? null;
}

export function isMemberHubPath(pathname: string): boolean {
  return pathname === MEMBER_HUB_PATH;
}

export function isMemberAccountSubPath(pathname: string): boolean {
  return memberAccountNavItems.some((entry) => entry.href === pathname);
}
