import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";
import type { AvailabilitySearchResultItem } from "@/lib/queries/availability-search";

export function buildAssistantVillaPublicUrl(
  domain: string | null | undefined,
  slug: string,
  checkIn?: string,
  checkOut?: string,
  adults?: number
) {
  const host = sanitizePublicBookingDomain(domain);
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  if (adults) params.set("adults", String(adults));
  const query = params.toString();
  return `https://${host}/villalar/${slug}${query ? `?${query}` : ""}`;
}

export function formatAssistantVillaSummary(
  item: AvailabilitySearchResultItem,
  domain?: string | null
) {
  const price =
    item.quote.valid && item.quote.total > 0
      ? `${item.quote.total.toLocaleString("tr-TR")} ${item.quote.currency}`
      : "Fiyat için iletişime geçin";
  const link = buildAssistantVillaPublicUrl(
    domain,
    item.slug,
    item.checkIn,
    item.checkOut,
    item.guests + item.extraCapacity > 0 ? item.guests : undefined
  );

  return {
    id: item.id,
    name: item.name,
    region: item.regionName,
    guests: item.guests,
    extraCapacity: item.extraCapacity,
    nights: item.quote.nights,
    totalPrice: price,
    checkIn: item.checkIn,
    checkOut: item.checkOut,
    link,
    image: item.image,
  };
}

export function formatAssistantVillasForChat(
  items: AvailabilitySearchResultItem[],
  domain?: string | null
) {
  return items.slice(0, 5).map((item) => formatAssistantVillaSummary(item, domain));
}

export function formatAssistantVillasForWhatsApp(
  items: AvailabilitySearchResultItem[],
  domain?: string | null,
  guestName?: string | null
) {
  const greeting = guestName?.trim() ? `Merhaba ${guestName.trim()},` : "Merhaba,";
  const lines = items.slice(0, 5).map((item, index) => {
    const summary = formatAssistantVillaSummary(item, domain);
    return `${index + 1}. ${summary.name} (${summary.region})
${summary.checkIn} → ${summary.checkOut} · ${summary.nights} gece · ${summary.totalPrice}
${summary.link}`;
  });

  return `${greeting}

Size uygun villa seçenekleri:

${lines.join("\n\n")}

Detay ve rezervasyon için linklere tıklayabilir veya buradan yazmaya devam edebilirsiniz. 🐝`;
}
