import type { AssistantSearchState } from "@/lib/tatil-assistant-types";
import { slugifyTurkish } from "@/lib/tatildeyiz-next-data";

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
  subat: 2,
  şubat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  mayıs: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  ağustos: 8,
  eylul: 9,
  eylül: 9,
  ekim: 10,
  kasim: 11,
  kasım: 11,
  aralik: 12,
  aralık: 12,
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
  datça: "datca",
  datca: "datca",
  alanya: "alanya",
  belek: "belek",
  kemer: "kemer",
};

function capitalizeWord(word: string) {
  const trimmed = word.trim();
  if (!trimmed) return "";
  return (
    trimmed.charAt(0).toLocaleUpperCase("tr-TR") +
    trimmed.slice(1).toLocaleLowerCase("tr-TR")
  );
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
  if (
    GREETINGS.has(lower) ||
    GREETINGS.has(words[0]?.toLocaleLowerCase("tr-TR") ?? "")
  ) {
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
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function normalizeMonthName(raw: string): number | null {
  const key = raw
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return MONTH_MAP[key] ?? MONTH_MAP[raw.toLocaleLowerCase("tr-TR")] ?? null;
}

function parseYearToken(raw?: string) {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return raw.length === 2 ? 2000 + n : n;
}

function inferStayYear(month: number, day: number, explicitYear?: number) {
  if (explicitYear) return explicitYear;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  if (candidate < today) year += 1;
  return year;
}

function parseTurkishDateToken(token: string, defaultYear?: number) {
  const trimmed = token.trim();
  const year = defaultYear ?? new Date().getFullYear();

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return toDateKey(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dotted = trimmed.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    const y = parseYearToken(dotted[3]) ?? inferStayYear(month, day);
    return toDateKey(y, month, day);
  }

  const monthName = trimmed.match(/^(\d{1,2})\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]+)(?:\s+(\d{4}))?$/u);
  if (monthName) {
    const day = Number(monthName[1]);
    const month = normalizeMonthName(monthName[2]);
    const y =
      parseYearToken(monthName[3]) ?? inferStayYear(month!, day, undefined);
    if (!month) return null;
    return toDateKey(y, month, day);
  }

  return null;
}

function buildRange(
  startDay: number,
  endDay: number,
  month: number,
  explicitYear?: number
) {
  const year = inferStayYear(month, startDay, explicitYear);
  const checkIn = toDateKey(year, month, startDay);
  const checkOut = toDateKey(year, month, endDay);
  if (!checkIn || !checkOut || checkIn >= checkOut) return null;
  return { checkIn, checkOut };
}

export function formatDateRangeDisplay(checkIn: string, checkOut: string) {
  const fmt = (key: string) => {
    const [y, m, d] = key.split("-");
    return `${d}.${m}.${y}`;
  };
  return `${fmt(checkIn)} - ${fmt(checkOut)}`;
}

export function extractStayDates(text: string): {
  checkIn: string;
  checkOut: string;
} | null {
  const normalized = text
    .replace(/–|—/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const explicitYearMatch = normalized.match(/\b(20\d{2})\b/);
  const explicitYear = explicitYearMatch
    ? Number(explicitYearMatch[1])
    : undefined;

  // 3-7 eylül / 3 - 7 Eylül 2026
  const sharedMonth = normalized.match(
    /^(\d{1,2})\s*-\s*(\d{1,2})\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]+)(?:\s+(20\d{2}))?$/u
  );
  if (sharedMonth) {
    const month = normalizeMonthName(sharedMonth[3]);
    if (month) {
      const range = buildRange(
        Number(sharedMonth[1]),
        Number(sharedMonth[2]),
        month,
        parseYearToken(sharedMonth[4]) ?? explicitYear
      );
      if (range) return range;
    }
  }

  // eylül 3-7 / Eylül 3 - 7 2026
  const monthFirst = normalized.match(
    /^([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\s+(\d{1,2})\s*-\s*(\d{1,2})(?:\s+(20\d{2}))?$/u
  );
  if (monthFirst) {
    const month = normalizeMonthName(monthFirst[1]);
    if (month) {
      const range = buildRange(
        Number(monthFirst[2]),
        Number(monthFirst[3]),
        month,
        parseYearToken(monthFirst[4]) ?? explicitYear
      );
      if (range) return range;
    }
  }

  // 10-17 Ağustos / 3/9 - 7/9
  const range = normalized.match(
    /(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|\d{1,2}\s+[a-zA-ZçğıöşüÇĞİÖŞÜ]+(?:\s+20\d{2})?)\s*-\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|\d{1,2}\s+[a-zA-ZçğıöşüÇĞİÖŞÜ]+(?:\s+20\d{2})?)/iu
  );
  if (range) {
    const checkIn = parseTurkishDateToken(range[1], explicitYear);
    const checkOut = parseTurkishDateToken(range[2], explicitYear);
    if (checkIn && checkOut && checkIn < checkOut) return { checkIn, checkOut };
  }

  // 03.09.2026 - 07.09.2026
  const fullDotted = normalized.match(
    /^(\d{1,2})[./](\d{1,2})[./](\d{2,4})\s*-\s*(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/u
  );
  if (fullDotted) {
    const checkIn = toDateKey(
      parseYearToken(fullDotted[3])!,
      Number(fullDotted[2]),
      Number(fullDotted[1])
    );
    const checkOut = toDateKey(
      parseYearToken(fullDotted[6])!,
      Number(fullDotted[5]),
      Number(fullDotted[4])
    );
    if (checkIn && checkOut && checkIn < checkOut) return { checkIn, checkOut };
  }

  return null;
}

export function extractGuestCount(text: string): number | null {
  const match = text.match(
    /(\d{1,2})\s*(?:kişi|kisi|misafir|yetişkin|yetiskin|person|kisi)/iu
  );
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
  if (slugs.size > 0) return [...slugs];

  const slug = slugifyTurkish(text.trim());
  return slug.length >= 2 ? [slug] : [];
}

export function extractAmenityNames(text: string): string[] {
  const lower = text.toLocaleLowerCase("tr-TR").trim();
  if (
    SKIP_WORDS.has(lower) ||
    lower.includes("fark etmez") ||
    lower.includes("farketmez") ||
    lower === "yok" ||
    lower === "istemiyorum" ||
    lower === "yoktur"
  ) {
    return [];
  }

  const amenities: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/özel\s*havuz|ozel\s*havuz|havuzlu/iu, "Özel Havuz"],
    [/deniz\s*manzar/iu, "Deniz Manzarası"],
    [/jakuzi/iu, "Jakuzi"],
    [/çocuk\s*havuz|cocuk\s*havuz/iu, "Çocuk Havuzu"],
    [/klimal/iu, "Klima"],
    [/merkeze\s*yakın|merkeze\s*yakin/iu, "Merkeze Yakın"],
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
      return "Hangi bölgede tatil yapmak istersiniz?";
    case "awaiting_amenities":
      return "Tatil yapmak istediğiniz villada hangi özellikleri istersiniz?";
    default:
      return "Bir dakika, size uygun villaları arıyorum...";
  }
}

function buildDatesAckReply(state: AssistantSearchState) {
  const name = state.guestName?.trim();
  const range = formatDateRangeDisplay(state.checkIn!, state.checkOut!);
  return name
    ? `Teşekkürler ${name}, ${range} tarihlerini not aldım. Kaç kişilik bir yer arıyorsunuz?`
    : `${range} tarihlerini not aldım. Kaç kişilik bir yer arıyorsunuz?`;
}

function buildGuestsAckReply(state: AssistantSearchState) {
  const name = state.guestName?.trim();
  return name
    ? `Teşekkürler ${name}, ${state.adults} kişi için not aldım. Hangi bölgede tatil yapmak istersiniz?`
    : `${state.adults} kişi için not aldım. Hangi bölgede tatil yapmak istersiniz?`;
}

function buildRegionAckReply(state: AssistantSearchState) {
  const name = state.guestName?.trim();
  return name
    ? `Teşekkürler ${name}. Tatil yapmak istediğiniz villada hangi özellikleri istersiniz?`
    : "Tatil yapmak istediğiniz villada hangi özellikleri istersiniz?";
}

function buildRetryReply(step: AssistantFlowStep, state: AssistantSearchState) {
  const name = state.guestName?.trim();

  switch (step) {
    case "awaiting_name":
      return "Adınızı yazar mısınız? (Örneğin: Ahmet)";
    case "awaiting_dates":
      return name
        ? `${name}, tarihi tam anlayamadım. Örneğin: 3-7 Eylül veya 03.09.2026 - 07.09.2026 şeklinde yazabilir misiniz?`
        : "Tarihi tam anlayamadım. Örneğin: 3-7 Eylül veya 03.09.2026 - 07.09.2026 şeklinde yazabilir misiniz?";
    case "awaiting_guests":
      return name
        ? `${name}, kaç kişi konaklayacaksınız? (Örneğin: 4)`
        : "Kaç kişi konaklayacaksınız? (Örneğin: 4)";
    case "awaiting_region":
      return "Hangi bölgede tatil yapmak istersiniz? (Örneğin: Kalkan, Fethiye, Kaş)";
    case "awaiting_amenities":
      return "Tatil yapmak istediğiniz villada hangi özellikleri istersiniz? (İstemiyorsanız 'fark etmez' yazabilirsiniz.)";
    default:
      return buildFlowReply(step, state);
  }
}

export type FlowAdvanceResult =
  | { handled: true; reply: string; state: AssistantSearchState; readyToSearch: boolean }
  | { handled: false };

function tryParseStep(
  step: AssistantFlowStep,
  userText: string,
  state: AssistantSearchState
): FlowAdvanceResult | null {
  if (step === "awaiting_name") {
    const guestName = extractGuestName(userText);
    if (!guestName) return null;
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
    if (!dates) return null;
    const nextState: AssistantSearchState = { ...state, ...dates };
    return {
      handled: true,
      reply: buildDatesAckReply(nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_guests") {
    const adults = extractGuestCount(userText);
    if (!adults) return null;
    const nextState: AssistantSearchState = { ...state, adults };
    return {
      handled: true,
      reply: buildGuestsAckReply(nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_region") {
    const trimmed = userText.trim();
    if (trimmed.length < 2) return null;
    const regionSlugs = extractRegionSlugs(trimmed);
    if (!regionSlugs.length) return null;
    const nextState: AssistantSearchState = { ...state, regionSlugs };
    return {
      handled: true,
      reply: buildRegionAckReply(nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_amenities") {
    const trimmed = userText.trim();
    if (!trimmed) return null;
    const amenityNames = extractAmenityNames(trimmed);
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

  return null;
}

/** Aktif akış adımında cevabı işler; anlaşılmazsa aynı adım için tekrar sorar. */
export function processFlowStep(
  userText: string,
  state: AssistantSearchState
): FlowAdvanceResult {
  const step = resolveFlowStep(state);
  if (step === "ready") return { handled: false };

  const parsed = tryParseStep(step, userText, state);
  if (parsed) return parsed;

  return {
    handled: true,
    reply: buildRetryReply(step, state),
    state,
    readyToSearch: false,
  };
}

/** @deprecated processFlowStep kullanın */
export function tryAdvanceFlow(
  userText: string,
  state: AssistantSearchState
): FlowAdvanceResult {
  return processFlowStep(userText, state);
}
