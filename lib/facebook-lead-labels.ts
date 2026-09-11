import type { FacebookLeadStatus } from "@prisma/client";

export const FACEBOOK_LEAD_STATUS_LABELS: Record<FacebookLeadStatus, string> = {
  NEW: "Yeni",
  CONTACTED: "İletişim kuruldu",
  QUALIFIED: "Nitelikli",
  CONVERTED: "Dönüştü",
  LOST: "Kayıp",
  SPAM: "Spam",
};

export const FACEBOOK_LEAD_STATUS_COLORS: Record<FacebookLeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-amber-100 text-amber-800",
  QUALIFIED: "bg-violet-100 text-violet-800",
  CONVERTED: "bg-emerald-100 text-emerald-800",
  LOST: "bg-gray-100 text-gray-600",
  SPAM: "bg-rose-100 text-rose-800",
};

export const FACEBOOK_LEAD_CONTACT_CHANNELS = [
  { value: "phone", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-posta" },
  { value: "facebook_dm", label: "Facebook DM" },
  { value: "note", label: "Not" },
] as const;

export function buildFacebookLeadWebhookUrl(origin?: string): string {
  const base =
    origin?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://bont.tatildeyiz.com.tr";
  return `${base.replace(/\/+$/, "")}/api/webhooks/facebook-leads`;
}
