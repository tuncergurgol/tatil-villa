import { prisma } from "@/lib/db";
import { normalizeWhatsappCalendarText } from "@/lib/whatsapp-calendar-parser";

export type WhatsappCalendarLinkedVilla = {
  id: string;
  name: string;
  originalName: string;
  villaId: number | null;
};

export function normalizeWhatsappGroupId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.endsWith("@g.us")) return trimmed;
  return `${trimmed}@g.us`;
}

/** Aynı WhatsApp grubuna bağlı tüm aktif villaları getirir. */
export async function findVillasByWhatsappGroupId(
  groupExternalId: string
): Promise<WhatsappCalendarLinkedVilla[]> {
  const groupId = normalizeWhatsappGroupId(groupExternalId);
  if (!groupId) return [];

  const bareId = groupId.replace(/@g\.us$/, "");

  return prisma.villa.findMany({
    where: {
      active: true,
      OR: [{ whatsappGroupId: groupId }, { whatsappGroupId: bareId }],
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      originalName: true,
      villaId: true,
    },
  });
}

/**
 * Mesaj gövdesinde villa adı / orijinal ad / belge no (#123) geçiyorsa
 * yalnızca o villaları hedefler. Geçmiyorsa grubun tüm villalarına uygular.
 *
 * Örn. "Habitat 1-2" grubunda:
 * - "Habitat 1 24-27 tem ops" → yalnız Habitat 1
 * - "24-27 tem ops" → Habitat 1 ve Habitat 2
 */
export function resolveWhatsappCalendarTargetVillas(
  villas: WhatsappCalendarLinkedVilla[],
  messageBody: string
): WhatsappCalendarLinkedVilla[] {
  if (villas.length <= 1) return villas;

  const normalizedBody = normalizeWhatsappCalendarText(messageBody);
  if (!normalizedBody) return villas;

  const ranked = [...villas]
    .map((villa) => {
      const candidates = [
        villa.name,
        villa.originalName,
        villa.villaId != null ? `#${villa.villaId}` : "",
        villa.villaId != null ? String(villa.villaId) : "",
      ]
        .map((value) => normalizeWhatsappCalendarText(value))
        .filter((value) => value.length >= 2);

      const matchedToken = candidates
        .sort((a, b) => b.length - a.length)
        .find((token) => includesToken(normalizedBody, token));

      return {
        villa,
        score: matchedToken ? matchedToken.length : 0,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return villas;

  // Aynı mesajda birden fazla villa adı geçebilir.
  return ranked.map((item) => item.villa);
}

function includesToken(haystack: string, token: string) {
  if (!token) return false;
  if (/^\d+$/.test(token)) {
    // Saf sayı (#siz villaId) yalnızca kelime sınırıyla eşleşsin.
    return new RegExp(`(?:^|[^0-9])${token}(?:$|[^0-9])`).test(haystack);
  }
  return haystack.includes(token);
}
