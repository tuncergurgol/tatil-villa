import type { AssistantSearchState } from "@/lib/tatil-assistant-types";
import { isAssistantMoreOptionsRequest } from "@/lib/tatil-assistant-format";
import { slugifyTurkish } from "@/lib/tatildeyiz-next-data";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
} from "@/lib/phone";

export type AssistantFlowStep =
  | "awaiting_name"
  | "awaiting_help"
  | "awaiting_dates"
  | "awaiting_guests"
  | "awaiting_party_kind"
  | "awaiting_party_detail"
  | "awaiting_region"
  | "awaiting_amenities"
  | "awaiting_phone"
  | "ready";

const GREETINGS = new Set([
  "merhaba",
  "merhabalar",
  "selam",
  "selamlar",
  "selamun aleykum",
  "selamunaleykum",
  "sa",
  "s.a",
  "iyi gunler",
  "iyi aksamlar",
  "gunaydin",
  "kolay gelsin",
  "hey",
  "hello",
  "hi",
  "mrb",
  "slm",
]);

function foldGreeting(text: string) {
  return text
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .replace(/\s*\.\s*/g, ".")
    .replace(/[.!?,…]+$/g, "")
    .trim();
}

/** Mesajın tamamı selamlaşmaysa sohbet başa alınır. */
export function isConversationGreeting(text: string) {
  return GREETINGS.has(foldGreeting(text));
}

const SKIP_WORDS = new Set([
  "evet",
  "hayır",
  "tamam",
  "ok",
  "olur",
  "yok",
  "farketmez",
  "fark etmez",
  "aile",
  "ailece",
  "arkadaş",
  "arkadas",
  "arkadaşlar",
  "arkadaslar",
  "arkadaşlarla",
  "yetişkin",
  "yetiskin",
  "çocuk",
  "cocuk",
  "bebek",
  "grubu",
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
  islamlar: "islamar",
  "islamlar": "islamar",
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
  kayaköy: "kayakoy",
  kayakoy: "kayakoy",
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

const PLACEHOLDER_NAMES = new Set([
  "misafir",
  "müşteri",
  "musteri",
  "test",
  "test test",
  "deneme",
]);

function foldedName(name: string) {
  return name.trim().toLocaleLowerCase("tr-TR");
}

/** Bölge, selamlama ve yer tutucu kelimeler kişi adı değildir. */
export function usablePersonName(name: string | null | undefined) {
  const trimmed = name?.trim() ?? "";
  if (trimmed.length < 2) return "";
  const folded = foldedName(trimmed);
  if (PLACEHOLDER_NAMES.has(folded)) return "";
  const parts = folded.split(/\s+/).filter(Boolean);
  if (
    parts.length > 0 &&
    parts.every(
      (part) =>
        GREETINGS.has(part) ||
        SKIP_WORDS.has(part) ||
        Boolean(REGION_ALIASES[part])
    )
  ) {
    return "";
  }
  return formatName(trimmed);
}

function legacyGuestFlow(state: AssistantSearchState) {
  return (
    !state.freshIntake &&
    !state.partyKind &&
    !state.countsCollected &&
    (state.regionAny ||
      (state.regionSlugs?.length ?? 0) > 0 ||
      Boolean(state.amenitiesCollected) ||
      (state.sentVillaIds?.length ?? 0) > 0)
  );
}

export function partyCapacity(state: AssistantSearchState) {
  return (state.adults ?? 0) + (state.children ?? 0);
}

export function resolveFlowStep(state: AssistantSearchState): AssistantFlowStep {
  if (!usablePersonName(state.guestName)) return "awaiting_name";
  if (!state.helpAsked) return "awaiting_help";
  if (!state.checkIn || !state.checkOut) return "awaiting_dates";
  if (!legacyGuestFlow(state)) {
    const hasGuestAnswer =
      state.guestsAny ||
      state.countsCollected ||
      (state.provisionalGuests ?? 0) > 0 ||
      partyCapacity(state) > 0;
    if (!hasGuestAnswer) return "awaiting_guests";
    if (!state.partyKind) return "awaiting_party_kind";
    if (!state.countsCollected && !state.guestsAny) return "awaiting_party_detail";
  } else if (!state.adults && !state.guestsAny && partyCapacity(state) <= 0) {
    return "awaiting_guests";
  }
  if (!state.regionAny && !state.regionSlugs?.length) return "awaiting_region";
  if (!state.amenitiesCollected && !(state.amenityNames?.length ?? 0)) {
    return "awaiting_amenities";
  }
  if (!state.phoneCollected || !state.guestPhone?.trim()) return "awaiting_phone";
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
  if (isConversationGreeting(trimmed)) return null;
  if (GREETINGS.has(foldGreeting(words[0] ?? ""))) {
    if (words.length === 1) return null;
    const greeted = words.slice(1).join(" ");
    return usablePersonName(greeted) || null;
  }

  return usablePersonName(words.slice(0, 2).join(" ")) || null;
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

function foldTr(raw: string) {
  return raw
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/['’]/g, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const MONTH_BY_FOLD: Record<string, number> = {};
for (const [name, month] of Object.entries(MONTH_MAP)) {
  MONTH_BY_FOLD[foldTr(name)] = month;
}

const MONTH_NAME_RE =
  "ocak|subat|şubat|mart|nisan|mayis|mayıs|haziran|temmuz|agustos|ağustos|eylul|eylül|ekim|kasim|kasım|aralik|aralık";

function normalizeMonthName(raw: string): number | null {
  const key = foldTr(raw);
  if (MONTH_BY_FOLD[key]) return MONTH_BY_FOLD[key];
  const softened = key.replace(/g(?=(tan|ten|dan|den|ta|te|da|de|a|e)$)/, "k");
  const stem = softened.replace(/(tan|ten|dan|den|ta|te|da|de|a|e)$/, "");
  return MONTH_BY_FOLD[stem] ?? null;
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

type DateMention = { day: number; month: number; year?: number };

function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function resolveStayRange(start: DateMention, end: DateMention) {
  let startYear = start.year;
  let endYear = end.year;
  const rollsForward =
    end.month < start.month ||
    (end.month === start.month && end.day <= start.day);

  if (startYear && !endYear) {
    endYear = rollsForward ? startYear + 1 : startYear;
  } else if (!startYear && endYear) {
    startYear = rollsForward ? endYear - 1 : endYear;
  } else if (!startYear && !endYear) {
    startYear = inferStayYear(start.month, start.day);
    endYear = startYear;
    const sameYearEnd = toDateKey(endYear, end.month, end.day);
    const sameYearStart = toDateKey(startYear, start.month, start.day);
    if (sameYearStart && sameYearEnd && sameYearEnd <= sameYearStart) {
      endYear = startYear + 1;
    }
  }

  if (!startYear || !endYear) return null;
  const checkIn = toDateKey(startYear, start.month, start.day);
  const checkOut = toDateKey(endYear, end.month, end.day);
  if (!checkIn || !checkOut || checkIn >= checkOut) return null;
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1 || nights > 180) return null;
  return { checkIn, checkOut };
}

function buildRange(
  startDay: number,
  endDay: number,
  month: number,
  explicitYear?: number
) {
  return resolveStayRange(
    { day: startDay, month, year: explicitYear },
    { day: endDay, month, year: explicitYear }
  );
}

function findDateMentions(text: string): DateMention[] {
  const re = new RegExp(
    String.raw`(?<!\d)(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?!\d)|(?<!\d)(\d{1,2})\s+([a-zA-ZçğıöşüÇĞİÖŞÜ']{3,})(?:\s+(20\d{2}|\d{2})(?!\d)(?!\s+\p{L}))?`,
    "giu"
  );
  const mentions: DateMention[] = [];
  for (const match of text.matchAll(re)) {
    if (match[1]) {
      mentions.push({
        day: Number(match[1]),
        month: Number(match[2]),
        year: parseYearToken(match[3]),
      });
      continue;
    }
    const month = normalizeMonthName(match[5] ?? "");
    if (!month) continue;
    mentions.push({
      day: Number(match[4]),
      month,
      year: parseYearToken(match[6]),
    });
  }
  return mentions;
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

  const iso = normalized.match(
    /(20\d{2}-\d{2}-\d{2})\s*-\s*(20\d{2}-\d{2}-\d{2})/
  );
  if (iso && iso[1] < iso[2]) return { checkIn: iso[1], checkOut: iso[2] };

  // 3/7 eylül, 1-5 ocak 2027, 1 ile 5 ocak
  const sharedMonth = normalized.match(
    /(\d{1,2})\s*(?:\/|-|ile|ve)\s*(\d{1,2})\s+([a-zA-ZçğıöşüÇĞİÖŞÜ']+)(?:\s+(20\d{2}|\d{2}))?/u
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
    new RegExp(
      String.raw`(?:^|[^\p{L}])(${MONTH_NAME_RE})\s+(\d{1,2})\s*(?:-|ile|ve)\s*(\d{1,2})(?:\s+(20\d{2}|\d{2}))?`,
      "iu"
    )
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

  const mentions = findDateMentions(normalized);
  if (mentions.length >= 2) {
    const range = resolveStayRange(mentions[0], mentions[1]);
    if (range) return range;
  }

  return null;
}

function mentionsMonthName(text: string) {
  return Object.keys(MONTH_MAP).some((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `(^|[^a-zA-ZçğıöşüÇĞİÖŞÜ])${escaped}(?:['’]?(?:ta|te|da|de|ın|in|un|ün|a|e))?(?=$|[^a-zA-ZçğıöşüÇĞİÖŞÜ])`,
      "iu"
    ).test(text);
  });
}

/** "Ocak başı" gibi günü belli olmayan dönem. */
export function isVagueStayPeriod(text: string) {
  if (extractStayDates(text) || /\d/.test(text)) return false;
  const lower = text.toLocaleLowerCase("tr-TR");
  if (mentionsMonthName(text)) return true;
  return /ba[sş][ıi](?:nda)?|sonu(?:nda)?|ortas[ıi](?:nda)?|civar|dolay|haftaya|bu\s*ay|gelecek\s*ay|önümüzdeki\s*hafta|onumuzdeki\s*hafta|yaz[ıi]n|k[ıi][sş][ıi]n|bayram/iu.test(
    lower
  );
}

function isAffirmative(text: string) {
  return /^(evet|evt|var|olur|tamam|net)(?:\b|[\s!.?]|$)/iu.test(text.trim());
}

function isNegative(text: string) {
  return /^(yok|yoktur|hayır|hayir|değil|degil|maalesef|net\s*değil|net\s*degil)(?:\b|[\s!.?]|$)/iu.test(
    text.trim()
  );
}

export function extractGuestCounts(text: string): number[] {
  const list = text.match(
    /(\d{1,2}(?:\s*(?:,|\/|ve)\s*\d{1,2})+)\s*(?:kişilik|kisilik|kişi|kisi)/iu
  );
  if (list?.[1]) {
    const counts = [...list[1].matchAll(/\d{1,2}/g)]
      .map((match) => Number(match[0]))
      .filter((count) => count >= 1 && count <= 30);
    return [...new Set(counts)];
  }
  const single = extractGuestCount(text);
  return single ? [single] : [];
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

function labeledCount(text: string, label: string) {
  const before = text.match(new RegExp(`(\\d{1,2})\\s*(?:${label})`, "iu"));
  const after = text.match(new RegExp(`(?:${label})\\s*[:\\-]?\\s*(\\d{1,2})`, "iu"));
  const raw = before?.[1] ?? after?.[1];
  if (!raw) return null;
  const count = Number(raw);
  return count >= 0 && count <= 20 ? count : null;
}

/** "2 yetişkin 1 çocuk 1 bebek" gibi bir dağılım. Bebek kapasiteye girmez. */
export function extractPartyComposition(text: string) {
  const lower = text.toLocaleLowerCase("tr-TR");
  const adults = labeledCount(lower, "yetişkin|yetiskin|yetişikin");
  const children = labeledCount(lower, "çocuk|cocuk");
  const babies = labeledCount(lower, "bebek|bebeg");
  const childNone = /çocuk(?:lar)?\s*yok|cocuk(?:lar)?\s*yok|çocuksuz|cocuksuz/iu.test(lower);
  const babyNone = /bebek(?:ler)?\s*yok|bebeg(?:ler)?\s*yok|bebeksiz/iu.test(lower);
  if (adults == null && children == null && babies == null && !childNone && !babyNone) {
    return null;
  }
  return {
    adults: adults ?? 0,
    children: childNone ? 0 : (children ?? 0),
    babies: babyNone ? 0 : (babies ?? 0),
  };
}

export function extractPartyKind(text: string): "family" | "friends" | null {
  if (/arkada[sş]/iu.test(text)) return "friends";
  if (/aile\s*de[gğ]il/iu.test(text)) return "friends";
  if (/(^|[^\p{L}])aile(?:ce|yle|miz|yiz)?(?=$|[^\p{L}])/iu.test(text)) return "family";
  return null;
}

function partyDetailFromText(text: string, provisionalGuests?: number) {
  const composition = extractPartyComposition(text);
  if (composition) return composition;
  if (
    provisionalGuests &&
    provisionalGuests > 0 &&
    /hepsi\s*yetişkin|hepsi\s*yetiskin|sadece\s*yetişkin|sadece\s*yetiskin|yetişkiniz|yetiskinler/iu.test(
      text
    )
  ) {
    return { adults: provisionalGuests, children: 0, babies: 0 };
  }
  const triple = text
    .trim()
    .match(/^(\d{1,2})\s*[,/+-]\s*(\d{1,2})\s*[,/+-]\s*(\d{1,2})$/);
  if (!triple) return null;
  const adults = Number(triple[1]);
  const children = Number(triple[2]);
  const babies = Number(triple[3]);
  if ([adults, children, babies].some((count) => count < 0 || count > 20)) return null;
  return { adults, children, babies };
}

export function extractRegionSlugs(text: string): string[] {
  const lower = text.toLocaleLowerCase("tr-TR");
  const known = regionHitsInText(text).map((hit) => hit.slug);
  if (known.length > 0) return [...new Set(known)];
  if (
    /fark\s*etmez|farketmez/iu.test(lower) ||
    SKIP_WORDS.has(lower.trim()) ||
    extractAmenityNames(text).length > 0
  ) {
    return [];
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length !== 1 || /\d/.test(text)) return [];

  const slug = slugifyTurkish(text.trim());
  return slug.length >= 2 ? [slug] : [];
}

export function extractGuestPhone(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const candidates =
    trimmed.match(
      /(?:\+90|0)?[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g
    ) ?? trimmed.match(/\b5\d{9}\b/g);

  for (const candidate of candidates ?? []) {
    const e164 = normalizePhoneToE164(candidate);
    if (isValidTurkishMobileE164(e164)) return e164;
  }

  const e164 = normalizePhoneToE164(trimmed);
  if (isValidTurkishMobileE164(e164)) return e164;

  return null;
}

const FEATURE_STOP = new Set([
  "villa",
  "izin",
  "var",
  "yok",
  "ile",
  "ve",
  "icin",
  "bir",
  "birde",
  "kabul",
  "edilir",
  "olur",
  "olsun",
  "aile",
  "arkadas",
  "grup",
  "grubu",
  "yetiskin",
  "cocuk",
  "bebek",
]);

let featureCatalog: string[] = [];
let regionCatalog: { name: string; slug: string }[] = [];

/** Bu turdaki villa özellik ve kategori adları. Akış senkron ilerlediği için tur başında kurulur. */
export function setAssistantFeatureCatalog(names: string[]) {
  featureCatalog = names;
}

/** Aktif bölgeler. Akış senkron ilerlediği için tur başında kurulur. */
export function setAssistantRegionCatalog(regions: { name: string; slug: string }[]) {
  regionCatalog = regions;
}

function foldRegionText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mentionsRegionName(text: string, name: string) {
  const foldedText = foldRegionText(text);
  const foldedName = foldRegionText(name);
  if (foldedName.length < 3) return false;
  const escaped = foldedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^a-z0-9])${escaped}(?:da|de|ta|te|dan|den|tan|ten|ya|ye|a|e)?(?=$|[^a-z0-9])`,
    "i"
  ).test(foldedText);
}

function regionHitsInText(text: string) {
  const hits: { name: string; slug: string }[] = [];
  for (const [alias, slug] of Object.entries(REGION_ALIASES)) {
    if (mentionsRegionName(text, alias)) hits.push({ name: alias, slug });
  }
  for (const region of regionCatalog) {
    const label = region.slug.replace(/-/g, " ");
    if (mentionsRegionName(text, region.name) || mentionsRegionName(text, label)) {
      hits.push(region);
    }
  }
  const unique = new Map<string, { name: string; slug: string }>();
  for (const hit of hits) unique.set(hit.slug, hit);
  return [...unique.values()].filter((hit) => {
    const name = foldRegionText(hit.name);
    return ![...unique.values()].some((other) => {
      if (other.slug === hit.slug) return false;
      const otherName = foldRegionText(other.name);
      return otherName.length > name.length && otherName.includes(name);
    });
  });
}

function foldFeatureText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function featureTokens(value: string) {
  return foldFeatureText(value)
    .split(" ")
    .map((token) => token.replace(/(imiz|umuz|miz|muz|lar|ler|lu|li|si)$/u, ""))
    .filter((token) => token.length >= 3 && !FEATURE_STOP.has(token));
}

function matchCatalogFeatures(text: string) {
  if (featureCatalog.length === 0) return [];
  const textTokens = featureTokens(text);
  if (textTokens.length === 0) return [];
  const hits: string[] = [];
  for (const name of featureCatalog) {
    const nameTokens = featureTokens(name);
    if (nameTokens.length === 0) continue;
    const matched = nameTokens.every((token) =>
      textTokens.some((word) => word === token || word.startsWith(token))
    );
    if (matched) hits.push(name);
  }
  const specific = hits.filter((name) => {
    const tokens = featureTokens(name);
    return !hits.some((other) => {
      if (other === name) return false;
      const otherTokens = featureTokens(other);
      return (
        otherTokens.length > tokens.length &&
        tokens.every((token) => otherTokens.includes(token))
      );
    });
  });
  const groups = new Map<string, string[]>();
  for (const name of specific) {
    const key = featureTokens(name).slice().sort().join("|");
    const list = groups.get(key) ?? [];
    list.push(name);
    groups.set(key, list);
  }
  return [...groups.values()].map(
    (list) => list.find((name) => !foldFeatureText(name).includes("villa")) ?? list[0]!
  );
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
  if (/evcil\s*hayvan/iu.test(lower) && !/giremez|edilmez|yasak/iu.test(lower)) {
    amenities.push("Evcil Hayvan İzinli");
  }
  const heated = /ısıtmalı\s*havuz|isitmali\s*havuz/iu.test(lower);
  const indoor = /kapalı\s*havuz|kapali\s*havuz/iu.test(lower);
  if (heated) amenities.push("Isıtmalı Havuz");
  if (indoor) amenities.push("Kapalı Havuz");

  const patterns: Array<[RegExp, string]> = [
    [/kahvalt/iu, "Ücretsiz Kahvaltı"],
    [/deniz\s*manzar/iu, "Deniz Manzarası"],
    [/jakuzi/iu, "Jakuzi"],
    [/çocuk\s*havuz|cocuk\s*havuz/iu, "Çocuk Havuzu"],
    [/klimal/iu, "Klima"],
    [/merkeze\s*yakın|merkeze\s*yakin/iu, "Merkeze Yakın"],
  ];

  if (!heated && !indoor && /özel\s*havuz|ozel\s*havuz|havuzlu/iu.test(lower)) {
    amenities.push("Özel Havuzlu");
  }

  for (const [pattern, label] of patterns) {
    if (pattern.test(lower)) amenities.push(label);
  }

  for (const name of matchCatalogFeatures(text)) {
    if (!amenities.some((item) => item.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) {
      amenities.push(name);
    }
  }

  return amenities.filter((name) => {
    const tokens = featureTokens(name);
    return !amenities.some((other) => {
      if (other === name) return false;
      const otherTokens = featureTokens(other);
      const narrower =
        otherTokens.length > tokens.length &&
        tokens.every((token) => otherTokens.includes(token));
      const villaAlias =
        otherTokens.length === tokens.length &&
        tokens.every((token) => otherTokens.includes(token)) &&
        foldFeatureText(name).includes("villa") &&
        !foldFeatureText(other).includes("villa");
      return narrower || villaAlias;
    });
  });
}

export const ASSISTANT_ASK_NAME =
  "Hitap edebilmek için adınızı öğrenebilir miyim?";

export const ASSISTANT_ASK_NET_DATES = "Net tarihleriniz var mı?";

export function buildHelpQuestion(state: AssistantSearchState) {
  const name = usablePersonName(state.guestName);
  if (!name) return "Nasıl yardımcı olabilirim?";
  return `Merhaba ${name}, nasıl yardımcı olabilirim?`;
}

export function buildConsultantOpening(state: AssistantSearchState) {
  if (!usablePersonName(state.guestName)) return ASSISTANT_ASK_NAME;
  return buildHelpQuestion(state);
}

function markHelpAsked(state: AssistantSearchState): AssistantSearchState {
  return state.helpAsked ? state : { ...state, helpAsked: true };
}

export function buildFlowReply(
  step: AssistantFlowStep,
  state: AssistantSearchState
): string {
  switch (step) {
    case "awaiting_name":
      return ASSISTANT_ASK_NAME;
    case "awaiting_help":
      return buildHelpQuestion(state);
    case "awaiting_dates":
      return "Hangi tarihlerde konaklamak istiyorsunuz.";
    case "awaiting_guests":
      return "Kaç kişilik bir yer arıyorsunuz?";
    case "awaiting_party_kind":
      return "Aile mi, arkadaş grubu mu?";
    case "awaiting_party_detail":
      return "Yetişkin, çocuk ve bebek sayısını yazar mısınız?";
    case "awaiting_region":
      return "Hangi bölgede tatil yapmak istersiniz?";
    case "awaiting_amenities":
      return "Villada hangi özellikleri istersiniz?";
    case "awaiting_phone":
      return "WhatsApp numaranızı yazar mısınız?";
    default:
      return "Seçenekleri inceliyorum, uygun olanları size sunacağım.";
  }
}

function buildDatesAckReply(state: AssistantSearchState) {
  return buildFlowReply("awaiting_guests", state);
}

function buildGuestsAckReply(state: AssistantSearchState) {
  return buildFlowReply(resolveFlowStep(state), state);
}

function buildRegionAckReply() {
  return "Villada hangi özellikleri istersiniz?";
}

function buildAmenitiesAckReply() {
  return "WhatsApp numaranızı yazar mısınız?";
}

function mentionsAlias(text: string, alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^a-zA-ZçğıöşüÇĞİÖŞÜ])${escaped}(?:['’]?(?:da|de|ta|te|dan|den|tan|ten))?(?=$|[^a-zA-ZçğıöşüÇĞİÖŞÜ])`,
    "iu"
  ).test(text);
}

function partySizesFor(counts: number[]) {
  const unique = [...new Set(counts.filter((count) => count >= 1 && count <= 16))];
  if (unique.length !== 1) return unique;
  const count = unique[0]!;
  return [count, count + 1].filter((value) => value <= 16);
}

function withPartyCounts(
  state: AssistantSearchState,
  counts: { adults: number; children: number; babies: number }
): AssistantSearchState {
  const capacity = counts.adults + counts.children;
  return {
    ...state,
    adults: counts.adults,
    children: counts.children,
    babies: counts.babies,
    provisionalGuests: capacity > 0 ? capacity : state.provisionalGuests,
    countsCollected: capacity > 0,
    guestsAny: false,
    partySizes: capacity > 0 ? partySizesFor([capacity]) : [],
  };
}

function regionSlugsInText(text: string) {
  const known = regionHitsInText(text).map((hit) => hit.slug);
  if (known.length > 0) return [...new Set(known)];
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const lower = trimmed.toLocaleLowerCase("tr-TR");
  if (
    words.length === 0 ||
    words.length > 3 ||
    isConversationGreeting(trimmed) ||
    isVagueStayPeriod(trimmed) ||
    SKIP_WORDS.has(lower) ||
    extractStayDates(text) ||
    extractAmenityNames(text).length > 0 ||
    /\d/.test(text) ||
    lower.includes("villa") ||
    words.length !== 1
  ) {
    return [];
  }
  const slug = slugifyTurkish(text.trim());
  return slug.length >= 2 ? [slug] : [];
}

/** Dolu bir aramada yeni tarih, bölge, kişi veya özellik gelirse eski kriteri silmeden günceller. */
export function applyCriterionUpdate(
  state: AssistantSearchState,
  text: string
): AssistantSearchState {
  const next: AssistantSearchState = { ...state };
  const dates = extractStayDates(text);
  if (dates) Object.assign(next, dates);

  const composition = extractPartyComposition(text);
  const counts = extractGuestCounts(text);
  if (composition && composition.adults + composition.children > 0) {
    Object.assign(next, withPartyCounts(next, composition));
  } else if (counts.length > 1) {
    next.adults = counts[0];
    next.children = 0;
    next.babies = next.babies ?? 0;
    next.provisionalGuests = counts[0];
    next.countsCollected = true;
    next.partySizes = partySizesFor(counts);
    next.guestsAny = false;
  } else if (counts.length === 1 && next.countsCollected) {
    next.adults = counts[0];
    next.children = 0;
    next.provisionalGuests = counts[0];
    next.partySizes = partySizesFor(counts);
    next.guestsAny = false;
  } else if (counts.length === 1) {
    next.provisionalGuests = counts[0];
    next.guestsAny = false;
  }

  const partyKind = extractPartyKind(text);
  if (partyKind) next.partyKind = partyKind;

  const regions = regionSlugsInText(text);
  if (regions.length > 0) {
    next.regionSlugs = regions;
    next.regionAny = false;
  }

  const lower = text.toLocaleLowerCase("tr-TR");
  const mentioned = extractAmenityNames(text);
  const rejectsAmenity = /olmas[ıi]n|istemiyorum|istemiyoruz|olmadan/u.test(lower);
  const replacesAmenities = /sadece|yaln[ıi]zca/u.test(lower);
  if (mentioned.length > 0 && rejectsAmenity) {
    const drop = new Set(mentioned);
    next.amenityNames = (next.amenityNames ?? []).filter((name) => !drop.has(name));
    next.amenitiesCollected = true;
  } else if (mentioned.length > 0 && replacesAmenities) {
    next.amenityNames = mentioned;
    next.amenitiesCollected = true;
  } else if (mentioned.length > 0) {
    next.amenityNames = [...new Set([...(next.amenityNames ?? []), ...mentioned])];
    next.amenitiesCollected = true;
  }

  return next;
}

export function searchCriteriaChanged(
  before: AssistantSearchState,
  after: AssistantSearchState
) {
  return (
    before.checkIn !== after.checkIn ||
    before.checkOut !== after.checkOut ||
    before.adults !== after.adults ||
    before.children !== after.children ||
    before.babies !== after.babies ||
    before.guestsAny !== after.guestsAny ||
    before.regionAny !== after.regionAny ||
    (before.partySizes ?? []).join(",") !== (after.partySizes ?? []).join(",") ||
    (before.regionSlugs ?? []).join(",") !== (after.regionSlugs ?? []).join(",") ||
    (before.amenityNames ?? []).join(",") !== (after.amenityNames ?? []).join(",")
  );
}

function harvestKnownSlots(
  text: string,
  state: AssistantSearchState
): AssistantSearchState {
  const next = applyCriterionUpdate(state, text);

  if (!next.guestPhone) {
    const guestPhone = extractGuestPhone(text);
    if (guestPhone) {
      next.guestPhone = guestPhone;
      next.phoneCollected = true;
    }
  }

  if (!next.guestName) {
    const guestName = extractGuestName(text);
    if (guestName) next.guestName = guestName;
  }

  return next;
}

function slotsChanged(before: AssistantSearchState, after: AssistantSearchState) {
  return (
    before.guestName !== after.guestName ||
    before.checkIn !== after.checkIn ||
    before.checkOut !== after.checkOut ||
    before.adults !== after.adults ||
    before.children !== after.children ||
    before.babies !== after.babies ||
    before.provisionalGuests !== after.provisionalGuests ||
    before.countsCollected !== after.countsCollected ||
    before.partyKind !== after.partyKind ||
    before.guestsAny !== after.guestsAny ||
    before.regionAny !== after.regionAny ||
    (before.partySizes ?? []).join(",") !== (after.partySizes ?? []).join(",") ||
    before.amenitiesCollected !== after.amenitiesCollected ||
    before.phoneCollected !== after.phoneCollected ||
    (before.regionSlugs ?? []).join(",") !== (after.regionSlugs ?? []).join(",") ||
    (before.amenityNames ?? []).join(",") !== (after.amenityNames ?? []).join(",")
  );
}

function buildProgressReply(
  _before: AssistantSearchState,
  after: AssistantSearchState,
  nextStep: AssistantFlowStep
) {
  return buildFlowReply(nextStep, after);
}

function buildRetryReply(step: AssistantFlowStep, state: AssistantSearchState) {
  switch (step) {
    case "awaiting_name":
      return ASSISTANT_ASK_NAME;
    case "awaiting_help":
      return buildHelpQuestion(state);
    case "awaiting_dates":
      return "Tarihi tam anlayamadım. 3/7 Eylül ya da 03.09.2026 - 07.09.2026 şeklinde yazabilir misiniz?";
    case "awaiting_guests":
      return "Kaç kişilik bir yer arıyorsunuz?";
    case "awaiting_party_kind":
      return "Aile mi, arkadaş grubu mu?";
    case "awaiting_party_detail":
      return "Yetişkin, çocuk ve bebek sayısını yazar mısınız? Örneğin 2 yetişkin, 1 çocuk, 0 bebek.";
    case "awaiting_region":
      return "Hangi bölgede tatil yapmak istersiniz?";
    case "awaiting_amenities":
      return "Villada hangi özellikleri istersiniz? Fark etmezse öyle de yazabilirsiniz.";
    case "awaiting_phone":
      return "WhatsApp numaranızı yazar mısınız?";
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
      reply: buildHelpQuestion(nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_help") {
    const nextState = markHelpAsked(state);
    const nextStep = resolveFlowStep(nextState);
    return {
      handled: true,
      reply: buildFlowReply(nextStep, nextState),
      state: nextState,
      readyToSearch: nextStep === "ready",
    };
  }

  if (step === "awaiting_dates") {
    const dates = extractStayDates(userText);
    if (!dates) return null;
    const nextState: AssistantSearchState = {
      ...state,
      ...dates,
      askedNetDates: false,
    };
    return {
      handled: true,
      reply: buildDatesAckReply(nextState),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_guests") {
    const updated = applyCriterionUpdate(state, userText);
    if (!updated.provisionalGuests && !updated.countsCollected) return null;
    const nextStep = resolveFlowStep(updated);
    return {
      handled: true,
      reply: buildFlowReply(nextStep, updated),
      state: updated,
      readyToSearch: nextStep === "ready",
    };
  }

  if (step === "awaiting_party_kind") {
    const kind = extractPartyKind(userText);
    if (!kind) return null;
    const nextState: AssistantSearchState = {
      ...applyCriterionUpdate(state, userText),
      partyKind: kind,
    };
    const nextStep = resolveFlowStep(nextState);
    return {
      handled: true,
      reply: buildFlowReply(nextStep, nextState),
      state: nextState,
      readyToSearch: nextStep === "ready",
    };
  }

  if (step === "awaiting_party_detail") {
    const composition = partyDetailFromText(userText, state.provisionalGuests);
    if (!composition || composition.adults + composition.children < 1) return null;
    const nextState = withPartyCounts(state, composition);
    const nextStep = resolveFlowStep(nextState);
    return {
      handled: true,
      reply: buildFlowReply(nextStep, nextState),
      state: nextState,
      readyToSearch: nextStep === "ready",
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
      reply: buildRegionAckReply(),
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
      reply: buildAmenitiesAckReply(),
      state: nextState,
      readyToSearch: false,
    };
  }

  if (step === "awaiting_phone") {
    const guestPhone = extractGuestPhone(userText);
    if (!guestPhone) return null;
    const nextState: AssistantSearchState = {
      ...state,
      guestPhone,
      phoneCollected: true,
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

function mentionsIndifferent(text: string) {
  return /fark\s*etmez|farketmez/iu.test(text);
}

function applyIndifferentAnswer(
  step: AssistantFlowStep,
  state: AssistantSearchState,
  userText: string
): AssistantSearchState | null {
  if (step === "awaiting_guests") {
    return {
      ...state,
      adults: undefined,
      children: undefined,
      babies: undefined,
      provisionalGuests: undefined,
      countsCollected: false,
      partySizes: undefined,
      guestsAny: true,
    };
  }
  if (step === "awaiting_party_kind") {
    return { ...state, partyKind: "any" };
  }
  if (step === "awaiting_party_detail") {
    const total = state.provisionalGuests ?? partyCapacity(state);
    if (total > 0) {
      return withPartyCounts(state, { adults: total, children: 0, babies: 0 });
    }
    return {
      ...state,
      adults: undefined,
      children: undefined,
      babies: undefined,
      partySizes: undefined,
      countsCollected: false,
      guestsAny: true,
    };
  }
  if (step === "awaiting_region") {
    const mentioned = extractAmenityNames(userText);
    const amenityNames = [
      ...new Set([...(state.amenityNames ?? []), ...mentioned]),
    ];
    return {
      ...state,
      regionSlugs: [],
      regionAny: true,
      amenityNames,
      amenitiesCollected:
        Boolean(state.amenitiesCollected) || amenityNames.length > 0,
    };
  }
  if (step === "awaiting_amenities") {
    return {
      ...state,
      amenityNames: [],
      amenitiesCollected: true,
    };
  }
  return null;
}

function hasRegionAlias(text: string) {
  return Object.keys(REGION_ALIASES).some((alias) => mentionsAlias(text, alias));
}

/** "Bana villa lazım" gibi kriter içermeyen yeni bir talep. */
export function isFreshVillaRequest(text: string) {
  const lower = text.trim().toLocaleLowerCase("tr-TR");
  if (!lower.includes("villa")) return false;
  if (extractStayDates(text) || extractGuestCounts(text).length > 0) return false;
  if (hasRegionAlias(text) || extractAmenityNames(text).length > 0) return false;
  return /laz[ıi]m|istiyor|ar[ıi]yor|bakar|gerek|bul|öner|oner/.test(lower);
}

function freshCriteriaState(state: AssistantSearchState): AssistantSearchState {
  return {
    guestName: state.guestName,
    guestPhone: state.guestPhone,
    phoneCollected: Boolean(state.guestPhone?.trim() || state.phoneCollected),
    helpAsked: Boolean(usablePersonName(state.guestName)),
    freshIntake: true,
  };
}

function restartedConversationState(state: AssistantSearchState): AssistantSearchState {
  const guestName = usablePersonName(state.guestName);
  return {
    guestName: guestName ?? undefined,
    guestPhone: state.guestPhone,
    phoneCollected: Boolean(state.guestPhone?.trim() || state.phoneCollected),
    helpAsked: false,
    freshIntake: true,
  };
}

/** Aktif akış adımında cevabı işler; anlaşılmazsa aynı adım için tekrar sorar. */
export function processFlowStep(
  userText: string,
  state: AssistantSearchState
): FlowAdvanceResult {
  if (isConversationGreeting(userText)) {
    const nextState = restartedConversationState(state);
    const nextStep = resolveFlowStep(nextState);
    return finishTurn(buildFlowReply(nextStep, nextState), nextState, false);
  }

  if (isFreshVillaRequest(userText)) {
    const nextState = freshCriteriaState(state);
    const nextStep = resolveFlowStep(nextState);
    return finishTurn(
      buildFlowReply(nextStep, nextState),
      nextState,
      nextStep === "ready"
    );
  }

  const step = resolveFlowStep(state);
  if (step === "awaiting_dates" && state.askedNetDates) {
    const dates = extractStayDates(userText);
    if (dates) {
      const nextState: AssistantSearchState = {
        ...state,
        ...dates,
        askedNetDates: false,
      };
      const nextStep = resolveFlowStep(nextState);
      return finishTurn(
        nextStep === "ready"
          ? "Seçenekleri inceliyorum, uygun olanları size sunacağım."
          : buildFlowReply(nextStep, nextState),
        nextState,
        nextStep === "ready"
      );
    }
    if (isAffirmative(userText) || isNegative(userText)) {
      return finishTurn("Hangi tarihlerde konaklamak istiyorsunuz.", {
        ...state,
        askedNetDates: false,
      }, false);
    }
  }

  if (
    (step === "awaiting_dates" || step === "ready") &&
    isVagueStayPeriod(userText)
  ) {
    const harvested = harvestKnownSlots(userText, state);
    return finishTurn(ASSISTANT_ASK_NET_DATES, {
      ...harvested,
      checkIn: undefined,
      checkOut: undefined,
      askedNetDates: true,
      sentVillaIds: [],
      moreOptionRounds: 0,
    }, false);
  }

  if (mentionsIndifferent(userText)) {
    const indifferent = applyIndifferentAnswer(step, state, userText);
    if (indifferent) {
      const nextStep = resolveFlowStep(indifferent);
      return finishTurn(
        nextStep === "ready"
          ? "Seçenekleri inceliyorum, uygun olanları size sunacağım."
          : buildFlowReply(nextStep, indifferent),
        indifferent,
        nextStep === "ready"
      );
    }
  }

  if (step === "ready") {
    if (isAssistantMoreOptionsRequest(userText)) return { handled: false };
    const updated = applyCriterionUpdate(state, userText);
    const continues =
      regionSlugsInText(userText).length > 0 || Boolean(extractStayDates(userText));
    if (!searchCriteriaChanged(state, updated) && !continues) return { handled: false };
    const nextState: AssistantSearchState = {
      ...updated,
      helpAsked: true,
      sentVillaIds: [],
      moreOptionRounds: 0,
    };
    const nextStep = resolveFlowStep(nextState);
    return finishTurn(
      nextStep === "ready"
        ? "Seçenekleri inceliyorum, uygun olanları size sunacağım."
        : buildFlowReply(nextStep, nextState),
      nextState,
      nextStep === "ready"
    );
  }

  const harvested = harvestKnownSlots(userText, state);
  if (slotsChanged(state, harvested)) {
    const nextStep = resolveFlowStep(harvested);
    return finishTurn(
      nextStep === "ready"
        ? buildFlowReply("ready", harvested)
        : buildProgressReply(state, harvested, nextStep),
      harvested,
      nextStep === "ready"
    );
  }

  const parsed = tryParseStep(step, userText, state);
  if (parsed) return finishTurn(parsed.reply, parsed.state, parsed.readyToSearch);

  return finishTurn(buildRetryReply(step, state), state, false);
}

function finishTurn(
  reply: string,
  state: AssistantSearchState,
  readyToSearch: boolean
): FlowAdvanceResult {
  const askingHelp = resolveFlowStep(state) === "awaiting_help";
  return {
    handled: true,
    reply,
    state: askingHelp ? markHelpAsked(state) : state,
    readyToSearch,
  };
}

/** @deprecated processFlowStep kullanın */
export function tryAdvanceFlow(
  userText: string,
  state: AssistantSearchState
): FlowAdvanceResult {
  return processFlowStep(userText, state);
}
