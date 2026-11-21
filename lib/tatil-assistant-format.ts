import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";
import type { AvailabilitySearchResultItem } from "@/lib/queries/availability-search";
import {
  appendUndocumentedBookingAccessParam,
  createUndocumentedVillaBookingAccessToken,
} from "@/lib/undocumented-villa-booking-access";
import { villaPublicPath } from "@/lib/villa-public-path";

function withGuestBookingAccess(
  url: string,
  item: Pick<AvailabilitySearchResultItem, "id" | "documented">
) {
  if (item.documented !== false) return url;
  return appendUndocumentedBookingAccessParam(
    url,
    createUndocumentedVillaBookingAccessToken(item.id)
  );
}

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
  return `https://${host}${villaPublicPath(slug)}${query ? `?${query}` : ""}`;
}

export function formatAssistantVillaSummary(
  item: AvailabilitySearchResultItem,
  domain?: string | null
) {
  const price =
    item.quote.valid && item.quote.total > 0
      ? `${item.quote.total.toLocaleString("tr-TR")} ${item.quote.currency}`
      : "Fiyat için iletişime geçin";
  const link = withGuestBookingAccess(
    buildAssistantVillaPublicUrl(
      domain,
      item.slug,
      item.checkIn,
      item.checkOut,
      item.guests + item.extraCapacity > 0 ? item.guests : undefined
    ),
    item
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

export const ASSISTANT_FIRST_OPTION_COUNT = 5;
export const ASSISTANT_MORE_OPTION_COUNT = 4;
export const ASSISTANT_MAX_MORE_ROUNDS = 3;
export const ASSISTANT_REFRESH_CRITERIA_MESSAGE =
  "Dilerseniz kriterleri birlikte yenileyelim.";

export const ASSISTANT_EMPTY_SEARCH_MESSAGE =
  "Bu kriterlerle uygun villa bulamadım. Tarih, bölge, kişi sayısı veya özelliği değiştirebilirsek yeniden bakabilirim.";

export function assistantOutsideServiceMessage(place: string) {
  return `${turkishLocative(place)} size hizmet veremiyoruz.`;
}

export function assistantMissingPriceMessage(place: string) {
  return `${turkishLocative(place)} henüz fiyat bilgisi iletilmedi, Tesis sahibi ile iletişime geçip size bilgi vereceğim.`;
}

export const ASSISTANT_UPDATE_HINT_MESSAGE =
  "Tarih, kişi sayısı, bölge ya da bir özellik yazarsanız seçeneklere birlikte bakalım.";

export function turkishLocative(name: string) {
  const lower = name.toLocaleLowerCase("tr-TR");
  const vowels = "aıoueiöü";
  const lastVowel = [...lower].reverse().find((char) => vowels.includes(char)) ?? "a";
  const back = "aıou".includes(lastVowel);
  const hard = "çfhkpşst".includes(lower.slice(-1));
  const suffix = `${hard ? "t" : "d"}${back ? "a" : "e"}`;
  return `${name}’${suffix}`;
}

function featurePhrase(name: string) {
  let text = name.replace(/\s*villalar$/iu, "").trim().toLocaleLowerCase("tr-TR");
  text = text.replace(/manzaras[ıi]$/iu, "manzaralı");
  if (/havuz$/iu.test(text)) text = `${text}lu`;
  return text;
}

function joinTurkish(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ve ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} ve ${items[items.length - 1]}`;
}

/** Arama başlamadan önce müşteriye kriterleri nazikçe söyler. */
export function buildAssistantLookingMessage(input: {
  regionNames?: string[];
  regionAny?: boolean;
  amenityNames?: string[];
}) {
  const features = joinTurkish(
    (input.amenityNames ?? []).map(featurePhrase).filter(Boolean)
  );
  const names = (input.regionNames ?? []).filter(Boolean);
  const place = input.regionAny || names.length === 0
    ? "Tüm bölgelerde"
    : names.length === 1
      ? turkishLocative(names[0]!)
      : `${joinTurkish(names)} için`;
  const subject = features ? `${place} ${features} seçenekleri` : `${place} seçenekleri`;
  const sentence = `${subject} inceliyorum, uygun olanları size sunacağım.`;
  return sentence.charAt(0).toLocaleUpperCase("tr-TR") + sentence.slice(1);
}

export function isAssistantMoreOptionsRequest(text: string) {
  const normalized = text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    normalized.includes("baska yok") ||
    normalized.includes("baska var") ||
    normalized.includes("baska secenek") ||
    normalized === "baska"
  );
}

export function pricedAssistantVillas(
  items: AvailabilitySearchResultItem[]
) {
  return items
    .filter((item) => item.quote.valid && item.quote.total > 0)
    .sort(
      (left, right) =>
        left.quote.total - right.quote.total ||
        left.name.localeCompare(right.name, "tr")
    );
}

export function formatAssistantVillasForChat(
  items: AvailabilitySearchResultItem[],
  domain?: string | null
) {
  return items
    .slice(0, ASSISTANT_FIRST_OPTION_COUNT)
    .map((item) => formatAssistantVillaSummary(item, domain));
}

export function formatAssistantVillaOfferMessage(
  item: AvailabilitySearchResultItem,
  options?: {
    domain?: string | null;
    guestName?: string | null;
    adults?: number;
    brand?: string;
  }
) {
  const greeting = options?.guestName?.trim()
    ? `Merhaba ${options.guestName.trim()},`
    : "Merhaba,";
  const total = `${Math.round(item.quote.total).toLocaleString("tr-TR")} TL`;
  const url = withGuestBookingAccess(
    buildAssistantVillaPublicUrl(
      options?.domain,
      item.slug,
      item.checkIn,
      item.checkOut,
      options?.adults
    ),
    item
  );

  return [
    greeting,
    "",
    `${item.name} uygun görünüyor:`,
    `Giriş: ${item.checkIn}`,
    `Çıkış: ${item.checkOut}`,
    `Gece: ${item.quote.nights}`,
    ...(options?.adults ? [`Kişi: ${options.adults}`] : []),
    `Toplam: ${total}`,
    "",
    url,
    "",
    options?.brand?.trim() || "Tatildeyiz",
  ].join("\n");
}

export function formatAssistantVillaOfferMessages(
  items: AvailabilitySearchResultItem[],
  options?: {
    domain?: string | null;
    guestName?: string | null;
    adults?: number;
    brand?: string;
  }
) {
  return items.map((item) => formatAssistantVillaOfferMessage(item, options));
}
