const AVATAR_COLORS = [
  "bg-red-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-blue-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-indigo-500",
] as const;

export function getOwnerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export function getOwnerAvatarColor(name: string) {
  let hash = 0;
  for (const char of name) {
    hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}

export function normalizeOwnerPhone(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+90")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("0")) return `+90${digits.slice(1)}`;
  return `+90${digits}`;
}

export function formatOwnerPhoneDisplay(phone: string) {
  if (!phone.trim()) return "-";

  const digits = phone.replace(/\D/g, "");
  const local =
    digits.startsWith("90") && digits.length >= 12
      ? digits.slice(2, 12)
      : digits.length === 10
        ? digits
        : null;

  if (local) {
    return `+90 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  return phone;
}

export function buildOwnerDisplayName(data: {
  type: "GERCEK_KISI" | "TUZEL_KISI";
  firstName?: string;
  lastName?: string;
  companyTitle?: string;
}) {
  if (data.type === "TUZEL_KISI") {
    return data.companyTitle?.trim() ?? "";
  }
  return `${data.firstName?.trim() ?? ""} ${data.lastName?.trim() ?? ""}`.trim();
}

export function splitOwnerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export const VILLA_OWNER_TYPE_LABELS = {
  GERCEK_KISI: "Gerçek Kişi",
  TUZEL_KISI: "Tüzel Kişi",
} as const;
