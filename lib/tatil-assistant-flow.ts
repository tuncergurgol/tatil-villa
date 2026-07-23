import type { AssistantSearchState } from "@/lib/tatil-assistant-types";

export type AssistantFlowStep =
  | "awaiting_name"
  | "awaiting_dates"
  | "awaiting_guests"
  | "awaiting_region"
  | "awaiting_amenities"
  | "ready";

const GREETINGS = new Set([
  "merhaba",
  "selam",
  "selamlar",
  "iyi günler",
  "günaydın",
  "hey",
  "hello",
  "hi",
  "mrb",
  "slm",
]);

const SKIP_WORDS = new Set([
  "evet",
  "hayır",
  "tamam",
  "ok",
  "olur",
  "yok",
  "farketmez",
  "fark etmez",
]);

const MONTH_MAP: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  agustos: 8,
  eylül: 9,
  eylul: 9,
  ekim: 10,
  kasım: 11,
  kasim: 11,
  aralık: 12,
  aralik: 12,
};

const REGION_ALIASES: Record<string, string> = {
  kalkan: "kalkan",
  fethiye: "fethiye",
  ölüdeniz: "oludeniz",
  oludeniz: "oludeniz",
  kaş: "kas",
  kas: "kas",
  dalyan: "dalyan",
  göcek: "gocek",
  gocek: "gocek",
  marmaris: "marmaris",
  bodrum: "bodrum",
  antalya: "antalya",
  sapanca: "sapanca",
  "muğla": "mugla",
  mugla: "mugla",
};

function capitalizeWord(word: string) {
  const trimmed = word.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toLocaleUpperCase("tr-TR") + trimmed.slice(1).toLocaleLowerCase("tr-TR");
}

function formatName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizeWord)
    .join(" ");
}

export function resolveFlowStep(state: AssistantSearchState): AssistantFlowStep {
  if (!state.guestName?.trim()) return "awaiting_name";
  if (!state.checkIn || !state.checkOut) return "awaiting_dates";
  if (!state.adults) return "awaiting_guests";
  if (!state.regionSlugs?.length) return "awaiting_region";
  if (!state.amenitiesCollected) return "awaiting_amenities";
  return "ready";
}

export function extractGuestName(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 60) return null;

  const lower = trimmed.toLocaleLowerCase("tr-TR");
  if (SKIP_WORDS.has(lower)) return null;

  const introMatch = trimmed.match(
    /(?:adım|adim|ismim|ben)\s+([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zA-ZçğıöşüÇĞİÖŞÜ\s'-]{0,40})/iu
  );
  if (introMatch?.[1]) {
    const name = introMatch[1].trim().split(/\s+/).slice(0, 2).join(" ");
    return formatName(name);
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return null;
  if (/\d/.test(trimmed)) return null;
  if (GREETINGS.has(lower) || GREETINGS.has(words[0]?.toLocaleLowerCase("tr-TR") ?? "")) {
    if (words.length === 1) return null;
    return formatName(words.slice(1).join(" "));
  }

  return formatName(words.slice(0, 2).join(" "));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseTurkishDateToken(token: string, defaultYear?: number) {
  const year = defaultYear ?? new Date().getFullYear();
  const iso = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return toDateKey(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dotted = token.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    const y = dotted[3]
      ? Number(dotted[3].length === 2 ? `20${dotted[3]}` : dotted[3])
      : year;
    return toDateKey(y, month, day);
  }

  const monthName = token
    .toLocaleLowerCase("tr-TR")
    .match(/^(\d{1,2})\s+([a-zçğıöşü]+)(?:\s+(\d{4}))?$/i);
  if (monthName) {
    const day = Number(monthName[1]);
    const month = MONTH_MAP[monthName[2]];
    const y = monthName[3] ? Number(monthName[3]) : year;
    if (!month) return null;
    return toDateKey(y, month, day);
  }

  return null;
}

export function extractStayDates(text: string): {
  checkIn: string;
  checkOut: string;
} | null {
  const normalized = text
    .replace(/–|—/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const defaultYear = new Date().getFullYear();

  const range = normalized.match(
    /(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|\d{1,2}\s+[a-zçğıöşü]+(?:\s+\d{4})?)\s*[-–]\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|\d{1,2}\s+[a-zçğıöşü]+(?:\s+\d{4})?)/i
  );
  if (range) {
    const checkIn = parseTurkishDateToken(range[1], defaultYear);
    const checkOut = parseTurkishDateToken(range[2], defaultYear);
    if (checkIn && checkOut && checkIn < checkOut) return { checkIn, checkOut };
  }

  const between = normalized.match(
    /(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|\d{1,2}\s+[a-zçğıöşü]+(?:\s+\d{4})?).{0,20}(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|\d{1,2}\s+[a-zçğıöşü]+(?:\s+\d{4})?)/i
  );
  if (between) {
    const checkIn = parseTurkishDateToken(between[1], defaultYear);
    const checkOut = parseTurkishDateToken(between[2], defaultYear);
    if (checkIn && checkOut && checkIn < checkOut) return { checkIn, checkOut };
  }

  return null;
}

export function extractGuestCount(text: string): number | null {
  const match = text.match(/(\d{1,2})\s*(?:kişi|kisi|misafir|yetişkin|yetiskin|person)/i);
  if (match) {
    const n = Number(match[1]);
    return n >= 1 && n <= 30 ? n : null;
  }
  const onlyNumber = text.trim().match(/^(\d{1,2})$/);
  if (onlyNumber) {
    const n = Number(onlyNumber[1]);
    return n >= 1 && n <= 30 ? n : null;
  }
  return null;
}

export function extractRegionSlugs(text: string): string[] {
  const lower = text.toLocaleLowerCase("tr-TR");
  const slugs = new Set<string>();
  for (const [alias, slug] of Object.entries(REGION_ALIASES)) {
    if (lower.includes(alias)) slugs.add(slug);
  }
  return [...slugs];
}

export function extractAmenityNames(text: string): string[] {
  const lower = text.toLocaleLowerCase("tr-TR");
  if (
    SKIP_WORDS.has(lower) ||
    lower.includes("fark etmez") ||
    lower.includes("farketmez") ||
    lower === "yok" ||
    lower === "istemiyorum"
  ) {
    return [];
  }

  const amenities: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/özel\s*havuz|ozel\s*havuz|havuzlu/u, "Özel Havuz"],
    [/deniz\s*manzar/u, "Deniz Manzarası"],
    [/jakuzi/u, "Jakuzi"],
    [/çocuk\s*havuz|cocuk\s*havuz/u, "Çocuk Havuzu"],
    [/klimal/u, "Klima"],
    [/merkeze\s*yakın|merkeze\s*yakin/u, "Merkeze Yakın"],
  ];

  for (const [pattern, label] of patterns) {
    if (pattern.test(lower)) amenities.push(label);
  }

  return amenities;
}

export function buildFlowReply(
  step: AssistantFlowStep,
  state: AssistantSearchState
): string {
  const name = state.guestName?.trim() || "";

  switch (step) {
    case "awaiting_name":
      return "Hitap edebilmem için adınızı öğrenebilir miyim?";
    case "awaiting_dates":
      return name
        ? `Merhaba ${name}, hangi tarihlerde konaklamak istiyorsunuz?`
        : "Hangi tarihlerde konaklamak istiyorsunuz?";
    case "awaiting_guests":
      return name
        ? `Teşekkürler ${name}, kaç kişilik bir yer arıyorsunuz?`
        : "Kaç kişilik bir yer arıyorsunuz?";
    case "awaiting_region":
      return name
        ? `${name}, hangi bölgede tatil yapmak istersiniz?`
        : "Hangi bölgede tatil yapmak istersiniz?";
    case "awaiting_amenities":
      return name
        ? `${name}, tatil yapmak istediğiniz villada hangi özellikleri istersiniz? (İstemiyorsanız 'fark etmez' yazabilirsiniz.)`
        : "Tatil yapmak istediğiniz villada hangi özellikleri istersiniz?";
    default:
      return "Bir dakika, size uygun villaları arıyorum...";
  }
}

export type FlowAdvanceResult =
  | { handled: true; reply: string; state: AssistantSearchState; readyToSearch: boolean }
  | { handled: false };

export function tryAdvanceFlow(
  userText: string,
  state: AssistantSearchState
): FlowAdvanceResult {
  const step = resolveFlowStep(state);

  if (step === "awaiting_name") {
    const guestName = extractGuestName(userText);
    if (!guestName) return { handled: false };
    const nextState: AssistantSearchState = { ...state, guestName };
    return {
      handled: true,
      reply: buildFlowReply("awaiting_dates", nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_dates") {
    const dates = extractStayDates(userText);
    if (!dates) return { handled: false };
    const nextState: AssistantSearchState = { ...state, ...dates };
    return {
      handled: true,
      reply: buildFlowReply("awaiting_guests", nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_guests") {
    const adults = extractGuestCount(userText);
    if (!adults) return { handled: false };
    const nextState: AssistantSearchState = { ...state, adults };
    return {
      handled: true,
      reply: buildFlowReply("awaiting_region", nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_region") {
    const regionSlugs = extractRegionSlugs(userText);
    if (!regionSlugs.length) return { handled: false };
    const nextState: AssistantSearchState = { ...state, regionSlugs };
    return {
      handled: true,
      reply: buildFlowReply("awaiting_amenities", nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_amenities") {
    const amenityNames = extractAmenityNames(userText);
    const nextState: AssistantSearchState = {
      ...state,
      amenityNames,
      amenitiesCollected: true,
    };
    return {
      handled: true,
      reply: buildFlowReply("ready", nextState),
      state: nextState,
      readyToSearch: true,
    };
  }

  return { handled: false };
}
