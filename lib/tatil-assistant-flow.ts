import type {
  AssistantPendingConfirm,
  AssistantSearchState,
} from "@/lib/tatil-assistant-types";
import { GENERIC_POOL_REQUEST } from "@/lib/villa-pool-amenities";
import {
  assistantOutsideServiceMessage,
  isAssistantMoreOptionsRequest,
} from "@/lib/tatil-assistant-format";
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

const WEEKDAY_FOLDS: Array<{ fold: string; day: number }> = [
  { fold: "pazartesi", day: 1 },
  { fold: "cumartesi", day: 6 },
  { fold: "carsamba", day: 3 },
  { fold: "persembe", day: 4 },
  { fold: "cuma", day: 5 },
  { fold: "sali", day: 2 },
  { fold: "pazar", day: 0 },
];

const WEEKDAY_LABELS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

const MONTH_LABELS = [
  "",
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const ORDINAL_NTH: Record<string, number | "last"> = {
  ilk: 1,
  birinci: 1,
  ikinci: 2,
  ucuncu: 3,
  dorduncu: 4,
  besinci: 5,
  sonuncu: "last",
  son: "last",
};

const WEEKDAY_SUFFIX =
  /^(?:n(?:den|dan|ten|tan|de|da|te|ta|in|un)|den|dan|ten|tan|de|da|te|ta|si|i|u|un|unun|gun|gunu|gunden)?$/;

const MONTH_SUFFIX =
  /^(?:un|unun|in|nin|n(?:dan|den|da|de|ta|te)|dan|den|da|de|ta|te|ayi|ayinin|ayinda)?$/;

function weekdayFromToken(token: string) {
  for (const item of WEEKDAY_FOLDS) {
    if (!token.startsWith(item.fold)) continue;
    if (WEEKDAY_SUFFIX.test(token.slice(item.fold.length))) return item.day;
  }
  return null;
}

function monthFromToken(token: string) {
  const names = Object.keys(MONTH_BY_FOLD).sort((left, right) => right.length - left.length);
  for (const name of names) {
    if (!token.startsWith(name)) continue;
    if (MONTH_SUFFIX.test(token.slice(name.length))) return MONTH_BY_FOLD[name] ?? null;
  }
  return null;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function weekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number | "last"
) {
  if (nth === "last") {
    const last = new Date(year, month, 0);
    const day = last.getDate() - ((last.getDay() - weekday + 7) % 7);
    return new Date(year, month - 1, day);
  }
  if (nth < 1 || nth > 5) return null;
  const first = new Date(year, month - 1, 1);
  const day = 1 + ((weekday - first.getDay() + 7) % 7) + (nth - 1) * 7;
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1) return null;
  return date;
}

function upcomingWeekdayOfMonth(
  month: number,
  weekday: number,
  nth: number | "last",
  today: Date
) {
  const todayStart = startOfLocalDay(today);
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const date = weekdayOfMonth(year, month, weekday, nth);
    if (date && date >= todayStart) return date;
  }
  return null;
}

function nextWeekdayAfter(start: Date, weekday: number) {
  const delta = (weekday - start.getDay() + 7) % 7;
  const days = delta === 0 ? 7 : delta;
  return addLocalDays(start, days);
}

function addLocalDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function upcomingWeekday(from: Date, weekday: number) {
  const start = startOfLocalDay(from);
  const delta = (weekday - start.getDay() + 7) % 7;
  return addLocalDays(start, delta);
}

function dateKeyFromLocal(date: Date) {
  return toDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function isDepartureToken(token: string) {
  return /^(cik|cikis|ayril)/.test(token);
}

function isArrivalToken(token: string) {
  return /^(giris|girelim|gireceg|giriyor|baslay)/.test(token);
}

function stayFromDates(start: Date, end: Date) {
  const checkIn = dateKeyFromLocal(start);
  const checkOut = dateKeyFromLocal(end);
  if (!checkIn || !checkOut || checkIn >= checkOut) return null;
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1 || nights > 180) return null;
  return { checkIn, checkOut };
}

function mentionedNights(text: string) {
  const match = foldTr(text).match(
    /(?:^|\s)(\d{1,2})\s*gece(?:lik|ligi)?(?=$|\s)/
  );
  if (!match?.[1]) return null;
  const nights = Number(match[1]);
  if (!Number.isInteger(nights) || nights < 1 || nights > 180) return null;
  return nights;
}

type WeekdayToken = { raw: string; weekday: number | null };

function isStayMarker(token: string) {
  return isArrivalToken(token) || isDepartureToken(token);
}

function nearestWeekdayIndex(
  tokens: WeekdayToken[],
  index: number,
  claimed: Set<number>
) {
  for (const direction of [-1, 1]) {
    for (let step = 1; step <= 2; step += 1) {
      const cursor = index + direction * step;
      const token = tokens[cursor];
      if (!token) break;
      if (token.weekday == null && isStayMarker(token.raw)) break;
      if (token.weekday == null) continue;
      if (claimed.has(cursor)) break;
      return cursor;
    }
  }
  return null;
}

/**
 * "Cumartesi giriş Pazar çıkış" veya "Cuma giriş 2 gecelik".
 * Gün, bugünden itibaren sıradaki tarihe bağlanır; gece sayısı çıkışı tamamlar.
 */
function extractNamedWeekdayStay(
  text: string,
  now: Date
): { checkIn: string; checkOut: string } | null {
  const tokens: WeekdayToken[] = foldTr(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const cleaned = raw.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, "");
      return { raw: cleaned, weekday: weekdayFromToken(cleaned) };
    });
  const claimed = new Set<number>();
  let startIndex: number | null = null;
  let endIndex: number | null = null;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || token.weekday != null) continue;
    const arrival = isArrivalToken(token.raw);
    const departure = isDepartureToken(token.raw);
    if (!arrival && !departure) continue;
    const weekdayIndex = nearestWeekdayIndex(tokens, index, claimed);
    if (weekdayIndex == null) continue;
    if (arrival && startIndex == null) {
      startIndex = weekdayIndex;
      claimed.add(weekdayIndex);
      continue;
    }
    if (departure && endIndex == null) {
      endIndex = weekdayIndex;
      claimed.add(weekdayIndex);
    }
  }

  const startWeekday = startIndex == null ? null : tokens[startIndex]?.weekday ?? null;
  const endWeekday = endIndex == null ? null : tokens[endIndex]?.weekday ?? null;
  if (startWeekday == null) return null;
  const start = upcomingWeekday(now, startWeekday);
  const nights = mentionedNights(text);
  const end =
    endWeekday != null
      ? nextWeekdayAfter(start, endWeekday)
      : nights != null
        ? addLocalDays(start, nights)
        : null;
  if (!end) return null;
  return stayFromDates(start, end);
}

/**
 * "Temmuzun ilk cumartesinden başlayıp bir sonraki cuma çıkmak".
 * Ayın sıradaki günü takvimden bulunur; çıkış, girişten sonraki ilk hedef gündür.
 * Gün sırası veya ay yoksa bu kalıp tarih üretmez.
 */
function extractOrdinalMonthStay(
  text: string,
  now: Date
): { checkIn: string; checkOut: string } | null {
  const tokens = foldTr(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({
      raw,
      month: monthFromToken(raw),
      weekday: weekdayFromToken(raw),
      ordinal: Object.prototype.hasOwnProperty.call(ORDINAL_NTH, raw)
        ? ORDINAL_NTH[raw]
        : null,
      isNext: raw === "sonraki" || raw === "ertesi",
    }));

  let startAt = -1;
  let ordinal: number | "last" | null = null;
  let startWeekday: number | null = null;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];
    if (current?.ordinal == null || next?.weekday == null) continue;
    startAt = index + 1;
    ordinal = current.ordinal;
    startWeekday = next.weekday;
    break;
  }
  if (startAt < 0 || ordinal == null || startWeekday == null) return null;

  let month: number | null = null;
  for (
    let index = Math.max(0, startAt - 3);
    index <= Math.min(tokens.length - 1, startAt + 3);
    index += 1
  ) {
    if (tokens[index]?.month != null) {
      month = tokens[index]?.month ?? null;
      break;
    }
  }
  if (month == null) return null;

  let endWeekday: number | null = null;
  for (let index = startAt + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) continue;
    if (token.isNext && tokens[index + 1]?.weekday != null) {
      endWeekday = tokens[index + 1]?.weekday ?? null;
      break;
    }
    if (token.weekday == null) continue;
    const ahead = tokens
      .slice(index + 1, index + 3)
      .some((item) => item && isDepartureToken(item.raw));
    if (ahead || isDepartureToken(token.raw)) {
      endWeekday = token.weekday;
      break;
    }
  }
  if (endWeekday == null) return null;

  const start = upcomingWeekdayOfMonth(month, startWeekday, ordinal, now);
  if (!start) return null;
  const end = nextWeekdayAfter(start, endWeekday);
  return stayFromDates(start, end);
}

/** Ayın sıradaki günü ya da "Cumartesi giriş Pazar çıkış" gibi yakın gün adı. */
export function extractRelativeStay(
  text: string,
  now: Date = new Date()
): { checkIn: string; checkOut: string } | null {
  return extractOrdinalMonthStay(text, now) ?? extractNamedWeekdayStay(text, now);
}

export function formatStayConfirmQuestion(checkIn: string, checkOut: string) {
  const describe = (key: string) => {
    const [yearRaw, monthRaw, dayRaw] = key.split("-").map(Number);
    const year = yearRaw ?? 0;
    const month = monthRaw ?? 0;
    const day = dayRaw ?? 0;
    const date = new Date(year, month - 1, day);
    return {
      day: pad2(day),
      month: MONTH_LABELS[month] ?? "",
      year,
      weekday: WEEKDAY_LABELS[date.getDay()] ?? "",
    };
  };
  const start = describe(checkIn);
  const end = describe(checkOut);
  const nights = nightsBetween(checkIn, checkOut);
  return `${start.day} ${start.month} ${start.year} ${start.weekday} Günü girişli ${end.day} ${end.month} ${end.year} ${end.weekday} günü çıkışlı ${nights} Gece doğru mudur`;
}

/** "6 y 2 ç" = 6 yetişkin, 2 çocuk. Tam yazılmış "6 yetişkin" buna girmez. */
export function extractShorthandParty(text: string): {
  adults?: number;
  children?: number;
  babies?: number;
} | null {
  const found: { adults?: number; children?: number; babies?: number } = {};
  const re = /(?:^|[^\p{L}\d])(\d{1,2})\s*([yçcb])(?!\p{L})/giu;
  for (const match of text.matchAll(re)) {
    const count = Number(match[1]);
    if (!Number.isFinite(count) || count < 0 || count > 20) continue;
    const letter = (match[2] ?? "").toLocaleLowerCase("tr-TR");
    if (letter === "y" && found.adults == null) found.adults = count;
    if ((letter === "ç" || letter === "c") && found.children == null) found.children = count;
    if (letter === "b" && found.babies == null) found.babies = count;
  }
  if (found.adults == null && found.children == null && found.babies == null) return null;
  return found;
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
  if (extractStayDates(text) || extractRelativeStay(text) || /\d/.test(text)) return false;
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

type PartyRole = "adults" | "children" | "babies";

type PartyComposition = {
  adults: number;
  children: number;
  babies: number;
  adultsSpecified: boolean;
  childrenSpecified: boolean;
  babiesSpecified: boolean;
};

const PARTY_ROLE_LABEL: Record<PartyRole, string> = {
  adults: "yetişkin",
  children: "çocuk",
  babies: "bebek",
};

function barePartyCount(text: string) {
  const match = text.trim().match(/^(\d{1,2})[.!?]?$/);
  if (!match) return null;
  const count = Number(match[1]);
  return count >= 1 && count <= 20 ? count : null;
}

function partyRoleWord(text: string): "yetişkin" | "çocuk" | "bebek" | null {
  const cleaned = text
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim()
    .toLocaleLowerCase("tr-TR");
  if (/^yetişkin(?:ler)?$|^yetiskin(?:ler)?$|^yetişikin(?:ler)?$/iu.test(cleaned)) {
    return "yetişkin";
  }
  if (/^çocuk(?:lar)?$|^cocuk(?:lar)?$/iu.test(cleaned)) return "çocuk";
  if (/^bebek(?:ler)?$|^bebeg(?:ler)?$/iu.test(cleaned)) return "bebek";
  return null;
}

function partyRoleKey(role: "yetişkin" | "çocuk" | "bebek"): PartyRole {
  if (role === "yetişkin") return "adults";
  if (role === "çocuk") return "children";
  return "babies";
}

/** "2" ve alt satırda "yetişkin" aynı dağılım cevabıdır. */
function stitchPartyLines(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return text.trim();
  const merged: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const count = barePartyCount(lines[index] ?? "");
    const nextRole = partyRoleWord(lines[index + 1] ?? "");
    if (count != null && nextRole) {
      merged.push(`${count} ${nextRole}`);
      index += 1;
      continue;
    }
    const role = partyRoleWord(lines[index] ?? "");
    const nextCount = barePartyCount(lines[index + 1] ?? "");
    if (role && nextCount != null) {
      merged.push(`${nextCount} ${role}`);
      index += 1;
      continue;
    }
    merged.push(lines[index] ?? "");
  }
  return merged.join(", ");
}

function clearPartyPending(state: AssistantSearchState): AssistantSearchState {
  if (state.pendingPartyCount == null && state.pendingPartyRole == null) return state;
  return { ...state, pendingPartyCount: undefined, pendingPartyRole: undefined };
}

/** "2 yetişkin 1 çocuk 1 bebek" gibi bir dağılım. Bebek kapasiteye girmez. */
export function extractPartyComposition(text: string): PartyComposition | null {
  const lower = stitchPartyLines(text).toLocaleLowerCase("tr-TR");
  const adults = labeledCount(lower, "yetişkin|yetiskin|yetişikin");
  const children = labeledCount(lower, "çocuk|cocuk");
  const babies = labeledCount(lower, "bebek|bebeg");
  const childNone = /çocuk(?:lar)?\s*yok|cocuk(?:lar)?\s*yok|çocuksuz|cocuksuz/iu.test(lower);
  const babyNone = /bebek(?:ler)?\s*yok|bebeg(?:ler)?\s*yok|bebeksiz/iu.test(lower);
  const adultsSpecified = adults != null;
  const childrenSpecified = children != null || childNone;
  const babiesSpecified = babies != null || babyNone;
  if (!adultsSpecified && !childrenSpecified && !babiesSpecified) return null;
  return {
    adults: adults ?? 0,
    children: childNone ? 0 : (children ?? 0),
    babies: babyNone ? 0 : (babies ?? 0),
    adultsSpecified,
    childrenSpecified,
    babiesSpecified,
  };
}

export function extractPartyKind(text: string): "family" | "friends" | null {
  if (/arkada[sş]/iu.test(text)) return "friends";
  if (/aile\s*de[gğ]il/iu.test(text)) return "friends";
  if (/(^|[^\p{L}])aile(?:ce|yle|miz|yiz)?(?=$|[^\p{L}])/iu.test(text)) return "family";
  return null;
}

function partyDetailFromText(text: string, provisionalGuests?: number): PartyComposition | null {
  const composition = extractPartyComposition(text);
  if (composition) return composition;
  if (
    provisionalGuests &&
    provisionalGuests > 0 &&
    /hepsi\s*yetişkin|hepsi\s*yetiskin|sadece\s*yetişkin|sadece\s*yetiskin|yetişkiniz|yetiskinler/iu.test(
      text
    )
  ) {
    return {
      adults: provisionalGuests,
      children: 0,
      babies: 0,
      adultsSpecified: true,
      childrenSpecified: true,
      babiesSpecified: true,
    };
  }
  const triple = stitchPartyLines(text)
    .trim()
    .match(/^(\d{1,2})\s*[,/+-]\s*(\d{1,2})\s*[,/+-]\s*(\d{1,2})$/);
  if (!triple) return null;
  const adults = Number(triple[1]);
  const children = Number(triple[2]);
  const babies = Number(triple[3]);
  if ([adults, children, babies].some((count) => count < 0 || count > 20)) return null;
  return {
    adults,
    children,
    babies,
    adultsSpecified: true,
    childrenSpecified: true,
    babiesSpecified: true,
  };
}

function preparePartyDetailAnswer(
  text: string,
  state: AssistantSearchState,
  previousUserText?: string
):
  | { hold: true; reply: string; state: AssistantSearchState }
  | { hold: false; text: string; state: AssistantSearchState } {
  const stitched = stitchPartyLines(text);
  if (extractPartyComposition(stitched) || partyDetailFromText(stitched, state.provisionalGuests)) {
    return { hold: false, text: stitched, state: clearPartyPending(state) };
  }

  const count = barePartyCount(stitched);
  const role = partyRoleWord(stitched);
  const previousCount = barePartyCount(previousUserText ?? "");
  const previousRole = partyRoleWord(previousUserText ?? "");
  const pendingCount = state.pendingPartyCount ?? previousCount;
  const pendingRole = state.pendingPartyRole ?? (previousRole ? partyRoleKey(previousRole) : undefined);

  if (count != null && pendingRole) {
    return {
      hold: false,
      text: `${count} ${PARTY_ROLE_LABEL[pendingRole]}`,
      state: clearPartyPending(state),
    };
  }
  if (role && pendingCount != null) {
    return {
      hold: false,
      text: `${pendingCount} ${role}`,
      state: clearPartyPending(state),
    };
  }
  if (count != null) {
    return {
      hold: true,
      reply: `Bu ${count} kişi yetişkin mi, çocuk mu, bebek mi?`,
      state: { ...state, pendingPartyCount: count, pendingPartyRole: undefined },
    };
  }
  if (role) {
    return {
      hold: true,
      reply: `Kaç ${role}?`,
      state: { ...state, pendingPartyRole: partyRoleKey(role), pendingPartyCount: undefined },
    };
  }
  return { hold: false, text: stitched, state };
}

export function extractRegionSlugs(text: string): string[] {
  const lower = text.toLocaleLowerCase("tr-TR");
  const mentioned = regionSlugsMentioned(text);
  if (mentioned.length > 0) return mentioned;
  if (
    /fark\s*etmez|farketmez/iu.test(lower) ||
    SKIP_WORDS.has(lower.trim()) ||
    extractAmenityNames(text).length > 0
  ) {
    return [];
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length !== 1 || /\d/.test(text) || regionCatalog.length > 0) return [];

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
  "arkadas",
  "grup",
  "grubu",
]);

let featureCatalog: string[] = [];

export type AssistantRegionNode = {
  id: string;
  parentId: string | null;
  level: "IL" | "ILCE" | "MAHALLE";
  name: string;
  slug: string;
};

let regionCatalog: AssistantRegionNode[] = [];

/** Bu turdaki villa özellik ve kategori adları. Akış senkron ilerlediği için tur başında kurulur. */
export function setAssistantFeatureCatalog(names: string[]) {
  featureCatalog = names;
}

/** Aktif bölgeler. Akış senkron ilerlediği için tur başında kurulur. */
export function setAssistantRegionCatalog(regions: AssistantRegionNode[]) {
  regionCatalog = regions;
}

function regionNodeBySlug(slug: string) {
  return regionCatalog.find((region) => region.slug === slug);
}

/** Seçilen yerin il, ilçe ve mahalle zinciri. */
export function regionTrailForSlug(slug: string) {
  const trail: NonNullable<AssistantSearchState["regionTrail"]> = {};
  const seen = new Set<string>();
  let current = regionNodeBySlug(slug);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const place = { name: current.name, slug: current.slug };
    if (current.level === "IL") trail.il = place;
    else if (current.level === "ILCE") trail.ilce = place;
    else trail.mahalle = place;
    current = current.parentId
      ? regionCatalog.find((region) => region.id === current?.parentId)
      : undefined;
  }
  return trail;
}

export function assistantPlaceName(state: AssistantSearchState) {
  return [
    state.regionTrail?.il?.name,
    state.regionTrail?.ilce?.name,
    state.regionTrail?.mahalle?.name,
  ]
    .filter(Boolean)
    .join(", ");
}

export function rememberRegionTrail(state: AssistantSearchState): AssistantSearchState {
  if (state.regionAny || !state.regionSlugs?.[0]) return state;
  if (state.regionTrail?.il || state.regionTrail?.ilce || state.regionTrail?.mahalle) {
    return state;
  }
  const trail = regionTrailForSlug(state.regionSlugs[0]);
  if (!trail.il && !trail.ilce && !trail.mahalle) return state;
  return { ...state, regionTrail: trail };
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
  const hits: AssistantRegionNode[] = [];
  for (const [alias, slug] of Object.entries(REGION_ALIASES)) {
    if (!mentionsRegionName(text, alias)) continue;
    hits.push(
      regionNodeBySlug(slug) ?? {
        id: slug,
        parentId: null,
        level: "ILCE",
        name: alias,
        slug,
      }
    );
  }
  for (const region of regionCatalog) {
    const label = region.slug.replace(/-/g, " ");
    if (mentionsRegionName(text, region.name) || mentionsRegionName(text, label)) {
      hits.push(region);
    }
  }
  const unique = new Map<string, AssistantRegionNode>();
  for (const hit of hits) {
    const current = unique.get(hit.slug);
    if (!current) {
      unique.set(hit.slug, hit);
      continue;
    }
    const currentTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(current.name);
    const nextTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(hit.name);
    if (nextTurkish && !currentTurkish) unique.set(hit.slug, hit);
    else if (!currentTurkish && !nextTurkish) unique.set(hit.slug, hit);
  }
  return [...unique.values()].filter((hit) => {
    const name = foldRegionText(hit.name);
    return ![...unique.values()].some((other) => {
      if (other.slug === hit.slug) return false;
      const otherName = foldRegionText(other.name);
      return otherName.length > name.length && otherName.includes(name);
    });
  });
}

const REGION_LEVEL_RANK = { IL: 1, ILCE: 2, MAHALLE: 3 };

/** Aynı netlikteki bütün yerler. "Kaş veya Kalkan" ikisini de bırakır. */
function regionSlugsMentioned(text: string): string[] {
  const hits = regionHitsInText(text);
  if (hits.length === 0) return [];
  const deepest = Math.max(...hits.map((hit) => REGION_LEVEL_RANK[hit.level]));
  const folded = foldRegionText(text);
  return hits
    .filter((hit) => REGION_LEVEL_RANK[hit.level] === deepest)
    .sort((left, right) => {
      const leftAt = folded.indexOf(foldRegionText(left.name));
      const rightAt = folded.indexOf(foldRegionText(right.name));
      return (leftAt < 0 ? folded.length : leftAt) - (rightAt < 0 ? folded.length : rightAt);
    })
    .map((hit) => hit.slug);
}

function specificRegionSlug(text: string) {
  const slugs = regionSlugsMentioned(text);
  return slugs.length === 1 ? (slugs[0] ?? "") : "";
}

const PLACE_STEM_STOP = new Set([
  "havuz",
  "manzara",
  "deniz",
  "villa",
  "kisi",
  "yetiskin",
  "cocuk",
  "bebek",
  "aile",
  "arkadas",
  "tarih",
  "gece",
  "fiyat",
  "uygun",
  "ozellik",
  "secenek",
  "plaj",
  "pazartesi",
  "sali",
  "carsamba",
  "persembe",
  "cuma",
  "cumartesi",
  "pazar",
  "ocak",
  "subat",
  "mart",
  "nisan",
  "mayis",
  "haziran",
  "temmuz",
  "agustos",
  "eylul",
  "ekim",
  "kasim",
  "aralik",
]);

function isKnownPlaceStem(stem: string) {
  return (
    regionCatalog.some(
      (region) =>
        foldRegionText(region.name) === stem ||
        foldRegionText(region.slug.replace(/-/g, "")) === stem
    ) || Object.keys(REGION_ALIASES).some((alias) => foldRegionText(alias) === stem)
  );
}

function displayPlace(raw: string) {
  const visible = raw
    .replace(
      /['’]?(?:dan|den|tan|ten|da|de|ta|te|bölgesi|bolgesi|mahallesi|ilçesi|ilcesi)$/iu,
      ""
    )
    .trim();
  if (visible.length < 3) return "";
  return (
    visible.charAt(0).toLocaleUpperCase("tr-TR") +
    visible.slice(1).toLocaleLowerCase("tr-TR")
  );
}

function locativeStem(folded: string) {
  const suffixes = [
    "nden",
    "ndan",
    "nten",
    "ntan",
    "den",
    "dan",
    "ten",
    "tan",
    "de",
    "da",
    "te",
    "ta",
  ];
  for (const suffix of suffixes) {
    if (!folded.endsWith(suffix)) continue;
    const stem = folded.slice(0, -suffix.length);
    if (stem.length >= 3) return stem;
  }
  return "";
}

function locativePlace(token: string) {
  const folded = foldRegionText(token);
  const stem = locativeStem(folded);
  if (!stem || PLACE_STEM_STOP.has(stem) || isKnownPlaceStem(stem)) return "";
  return displayPlace(token);
}

/** Katalogda olmayan bir yer. Tarih veya özellikle birlikte söylense de yakalanır. */
export function unknownServicePlace(text: string, step?: AssistantFlowStep) {
  if (regionCatalog.length === 0) return "";
  if (regionHitsInText(text).length > 0 || mentionsIndifferent(text)) return "";

  for (const token of text.split(/\s+/).filter(Boolean)) {
    const place = locativePlace(token);
    if (place) return place;
  }

  const hasAmenity = extractAmenityNames(text).length > 0;
  const hasGuests = extractGuestCounts(text).length > 0;
  if (!hasAmenity && !hasGuests) {
    const asked = text.match(
      /([a-zA-ZçğıöşüÇĞİÖŞÜ]{3,})\s+(?:bölgesi(?:nde)?|bolgesi(?:nde)?|mahallesi(?:nde)?|ilçesi(?:nde)?|ilcesi(?:nde)?|var\s*m[ıi]|varm[ıi])/iu
    );
    if (asked?.[1]) {
      const stem = foldRegionText(asked[1]);
      if (stem.length >= 3 && !PLACE_STEM_STOP.has(stem) && !isKnownPlaceStem(stem)) {
        return displayPlace(asked[1]);
      }
    }
  }

  if (step !== "awaiting_region" || hasAmenity || hasGuests || extractStayDates(text)) return "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length !== 1 || /\d/.test(words[0] ?? "")) return "";
  const word = words[0] ?? "";
  const folded = foldRegionText(word);
  if (!folded || folded.length < 3 || SKIP_WORDS.has(folded) || PLACE_STEM_STOP.has(folded)) {
    return "";
  }
  if (isKnownPlaceStem(folded)) return "";
  return displayPlace(word);
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
    [/ortak\s*havuz/iu, "Ortak Havuz"],
    [/klimal/iu, "Klima"],
    [/merkeze\s*yakın|merkeze\s*yakin/iu, "Merkeze Yakın"],
  ];

  if (!heated && !indoor && /özel\s*havuz|ozel\s*havuz|havuzlu/iu.test(lower)) {
    amenities.push("Özel Havuzlu");
  }

  const specificPool =
    heated ||
    indoor ||
    /çocuk\s*havuz|cocuk\s*havuz|özel\s*havuz|ozel\s*havuz|kapal[ıi]\s*havuz|ortak\s*havuz|is[ıi]tmal[ıi]\s*havuz|havuzlu|infinity|sonsuzluk|korunakl[ıi]\s*havuz/iu.test(
      lower
    );
  if (
    !specificPool &&
    /(?:^|[^a-zçğıöşü0-9])havuz(?:u)?(?:[^a-zçğıöşü0-9]|$)/iu.test(lower)
  ) {
    amenities.push(GENERIC_POOL_REQUEST);
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

function partyRemainder(state: AssistantSearchState) {
  if (state.countsCollected || state.guestsAny) return 0;
  const total = state.provisionalGuests ?? 0;
  if (total <= 0) return 0;
  if (state.adults == null && state.children == null && state.babies == null) return 0;
  const specified = (state.adults ?? 0) + (state.children ?? 0) + (state.babies ?? 0);
  return Math.max(0, total - specified);
}

function missingPartyLabels(state: AssistantSearchState) {
  const labels: string[] = [];
  if (state.adults == null) labels.push("yetişkin");
  if (state.children == null) labels.push("çocuk");
  if (state.babies == null) labels.push("bebek");
  return labels;
}

function joinTurkishList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ve ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} ve ${items[items.length - 1]}`;
}

function buildPartyDetailQuestion(state: AssistantSearchState) {
  const remaining = partyRemainder(state);
  if (remaining <= 0) return "Yetişkin, çocuk ve bebek sayısını yazar mısınız?";
  const missing = missingPartyLabels(state);
  if (missing.length === 0) {
    return `Toplam ${state.provisionalGuests} kişi olmuyor. Kalan ${remaining} kişi için yetişkin, çocuk ve bebek sayısını yazar mısınız?`;
  }
  return `Kalan ${remaining} kişi için ${joinTurkishList(missing)} sayısını yazar mısınız?`;
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
      return buildPartyDetailQuestion(state);
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

/** 2 kişilik grupta döküm sorulmaz; 2 yetişkin kabul edilir. */
function withPairAdults(state: AssistantSearchState): AssistantSearchState {
  if (state.countsCollected || state.guestsAny || !state.partyKind) return state;
  if (state.provisionalGuests !== 2) return state;
  if (state.adults != null || state.children != null || state.babies != null) return state;
  if (state.pendingPartyCount != null || state.pendingPartyRole != null) return state;
  return withPartyCounts(state, { adults: 2, children: 0, babies: 0 });
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
    pendingPartyCount: undefined,
    pendingPartyRole: undefined,
  };
}

function applyPartyComposition(
  state: AssistantSearchState,
  composition: PartyComposition
): AssistantSearchState {
  const inherit = !state.countsCollected;
  const adultsSpecified =
    composition.adultsSpecified || (inherit && state.adults != null);
  const childrenSpecified =
    composition.childrenSpecified || (inherit && state.children != null);
  const babiesSpecified =
    composition.babiesSpecified || (inherit && state.babies != null);
  const adults = composition.adultsSpecified
    ? composition.adults
    : adultsSpecified
      ? (state.adults ?? 0)
      : 0;
  const children = composition.childrenSpecified
    ? composition.children
    : childrenSpecified
      ? (state.children ?? 0)
      : 0;
  const babies = composition.babiesSpecified
    ? composition.babies
    : babiesSpecified
      ? (state.babies ?? 0)
      : 0;
  const total = state.provisionalGuests ?? 0;
  const specifiedSum =
    (adultsSpecified ? adults : 0) +
    (childrenSpecified ? children : 0) +
    (babiesSpecified ? babies : 0);
  const openEnded = Boolean(state.countsCollected) || total <= 0;
  const covered = openEnded || specifiedSum >= total;
  if (covered && adults + children > 0) {
    return withPartyCounts(state, { adults, children, babies });
  }
  return {
    ...state,
    adults: adultsSpecified ? adults : undefined,
    children: childrenSpecified ? children : undefined,
    babies: babiesSpecified ? babies : undefined,
    countsCollected: false,
    guestsAny: false,
    partySizes: undefined,
    pendingPartyCount: undefined,
    pendingPartyRole: undefined,
  };
}

function regionSlugsInText(text: string) {
  const mentioned = regionSlugsMentioned(text);
  if (mentioned.length > 0) return mentioned;
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
  if (
    composition &&
    (composition.adultsSpecified ||
      composition.childrenSpecified ||
      composition.babiesSpecified)
  ) {
    Object.assign(next, applyPartyComposition(next, composition));
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
    const breakdownFragment =
      barePartyCount(text) != null &&
      Boolean(next.partyKind) &&
      (next.provisionalGuests ?? 0) > 0 &&
      !next.countsCollected;
    if (!breakdownFragment) {
      next.provisionalGuests = counts[0];
      next.guestsAny = false;
    }
  }

  const partyKind = extractPartyKind(text);
  if (partyKind) next.partyKind = partyKind;

  const regions = regionSlugsInText(text);
  if (regions.length > 0) {
    next.regionSlugs = regions;
    next.regionAny = false;
    if (regions.length === 1) {
      const trail = regionTrailForSlug(regions[0] ?? "");
      if (trail.il || trail.ilce || trail.mahalle) next.regionTrail = trail;
    } else {
      next.regionTrail = undefined;
    }
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
      if (partyRemainder(state) > 0) return buildPartyDetailQuestion(state);
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
    const updated = withPairAdults(applyCriterionUpdate(state, userText));
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
    const nextState = withPairAdults({
      ...applyCriterionUpdate(state, userText),
      partyKind: kind,
    });
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
    if (!composition) return null;
    const nextState = applyPartyComposition(state, composition);
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
      regionTrail: undefined,
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

function isPureAffirmative(text: string) {
  const folded = foldTr(text).replace(/[.!?,]+$/g, "").trim();
  return [
    "evet",
    "evt",
    "olur",
    "tamam",
    "dogru",
    "aynen",
    "tabi",
    "tabii",
    "evet dogru",
    "dogru olur",
    "evet olur",
    "evet tamam",
  ].includes(folded);
}

function isPureNegative(text: string) {
  const folded = foldTr(text).replace(/[.!?,]+$/g, "").trim();
  return ["hayir", "degil", "yanlis", "yok", "hayir degil"].includes(folded);
}

function confirmRegion(text: string) {
  const slugs = regionSlugsMentioned(text);
  if (slugs.length === 0) return null;
  const hits = regionHitsInText(text);
  const names = slugs.map((slug) =>
    capitalizeWord(hits.find((item) => item.slug === slug)?.name || slug)
  );
  if (names.length === 1) {
    const name = names[0] ?? "";
    const folded = foldRegionText(name);
    const label = /(bolge|mahalle|ilce)/.test(folded) ? name : `${name} bölgesi`;
    return { slugs, label };
  }
  return { slugs, label: `${joinTurkishList(names)} bölgeleri` };
}

function inferredAlreadySaved(
  state: AssistantSearchState,
  proposal: AssistantPendingConfirm
) {
  const datesSame =
    !proposal.checkIn ||
    (state.checkIn === proposal.checkIn && state.checkOut === proposal.checkOut);
  const partySame =
    !proposal.party ||
    (Boolean(state.countsCollected) &&
      state.adults === proposal.adults &&
      state.children === proposal.children &&
      state.babies === proposal.babies);
  const regionSame =
    !proposal.regionSlugs?.length ||
    (state.regionSlugs ?? []).join(",") === proposal.regionSlugs.join(",");
  return datesSame && partySame && regionSame;
}

/** Kısaltılmış kişi sayısı, bölge ve göreli tarihi onay cümlesine çevirir. */
export function buildInferredConfirm(
  text: string,
  now: Date = new Date()
): AssistantPendingConfirm | null {
  const shorthand = extractShorthandParty(text);
  const stay = extractRelativeStay(text, now);
  if (!shorthand && !stay) return null;

  const region = confirmRegion(text);
  const labels: string[] = [];
  if (shorthand?.adults != null) labels.push(`${shorthand.adults} yetişkin`);
  if (shorthand?.children != null) labels.push(`${shorthand.children} çocuk`);
  if (shorthand?.babies != null) labels.push(`${shorthand.babies} bebek`);
  if ((shorthand || stay) && region) labels.push(region.label);

  const party = shorthand
    ? {
        adults: shorthand.adults ?? 0,
        children: shorthand.children ?? 0,
        babies: shorthand.babies ?? 0,
      }
    : null;
  const dateQuestion = stay
    ? formatStayConfirmQuestion(stay.checkIn, stay.checkOut)
    : "";
  const partyClause = labels.join(", ");
  const question = dateQuestion
    ? partyClause
      ? `${partyClause}, ${dateQuestion}`
      : dateQuestion
    : `${partyClause} doğru mudur`;

  return {
    question,
    checkIn: stay?.checkIn,
    checkOut: stay?.checkOut,
    party: Boolean(party),
    adults: party?.adults,
    children: party?.children,
    babies: party?.babies,
    regionSlugs: region && (shorthand || stay) ? region.slugs : undefined,
  };
}

function topicsDiffer(left: AssistantPendingConfirm, right: AssistantPendingConfirm) {
  return Boolean(left.checkIn) !== Boolean(right.checkIn) || Boolean(left.party) !== Boolean(right.party);
}

function commitPending(
  state: AssistantSearchState,
  pending: AssistantPendingConfirm
): AssistantSearchState {
  let next: AssistantSearchState = { ...state, pendingConfirm: undefined };
  if (pending.checkIn && pending.checkOut) {
    next = {
      ...next,
      checkIn: pending.checkIn,
      checkOut: pending.checkOut,
      askedNetDates: false,
    };
  }
  if (pending.party) {
    next = withPartyCounts(next, {
      adults: pending.adults ?? 0,
      children: pending.children ?? 0,
      babies: pending.babies ?? 0,
    });
  }
  if (pending.regionSlugs?.length === 1) {
    const trail = regionTrailForSlug(pending.regionSlugs[0] ?? "");
    next = {
      ...next,
      regionSlugs: pending.regionSlugs,
      regionAny: false,
      ...(trail.il || trail.ilce || trail.mahalle ? { regionTrail: trail } : {}),
    };
  } else if (pending.regionSlugs?.length) {
    next = {
      ...next,
      regionSlugs: pending.regionSlugs,
      regionAny: false,
      regionTrail: undefined,
    };
  }
  return next;
}

function rejectConfirmReply(pending: AssistantPendingConfirm) {
  if (pending.checkIn && pending.party) {
    return "Tarih, kişi sayısı veya bölge uymadı. Net tarih, yetişkin, çocuk ve bölgeyi yazar mısınız?";
  }
  if (pending.checkIn) {
    return "Tarihi tam anlayamadım. 3/7 Eylül ya da 03.09.2026 - 07.09.2026 şeklinde yazabilir misiniz?";
  }
  if (pending.regionSlugs?.length) {
    return "Kaç yetişkin, kaç çocuk olduğunu ve bölgeyi net yazar mısınız?";
  }
  return "Kaç yetişkin, kaç çocuk ve kaç bebek olduğunu yazar mısınız?";
}

function takeConfirmReply(
  userText: string,
  state: AssistantSearchState
): FlowAdvanceResult | null {
  const pending = state.pendingConfirm;
  if (!pending) return null;
  if (isPureAffirmative(userText)) {
    const committed = commitPending(state, pending);
    const queued = committed.confirmQueue ?? [];
    if (queued.length > 0) {
      const [nextConfirm, ...rest] = queued;
      if (!nextConfirm) {
        const settled = withPairAdults(committed);
        const step = resolveFlowStep(settled);
        return finishTurn(buildFlowReply(step, settled), settled, step === "ready");
      }
      const nextState: AssistantSearchState = {
        ...committed,
        pendingConfirm: nextConfirm,
        confirmQueue: rest.length > 0 ? rest : undefined,
      };
      return finishTurn(nextConfirm.question, nextState, false);
    }
    const settled = withPairAdults(committed);
    const step = resolveFlowStep(settled);
    return finishTurn(buildFlowReply(step, settled), settled, step === "ready");
  }
  if (isPureNegative(userText)) {
    return finishTurn(rejectConfirmReply(pending), {
      ...state,
      pendingConfirm: undefined,
      confirmQueue: undefined,
    }, false);
  }
  return null;
}

/** "Bana villa lazım" gibi kriter içermeyen yeni bir talep. */
export function isFreshVillaRequest(text: string) {
  const lower = text.trim().toLocaleLowerCase("tr-TR");
  if (!lower.includes("villa")) return false;
  if (extractStayDates(text) || extractRelativeStay(text) || extractGuestCounts(text).length > 0) {
    return false;
  }
  if (extractShorthandParty(text)) return false;
  if (regionHitsInText(text).length > 0 || extractAmenityNames(text).length > 0) return false;
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

/** "2 kişilik" onay cümlesine girmez; tarih onayından sonra kişi sorusu tekrarlanmasın. */
function rememberPlainGuestCount(
  state: AssistantSearchState,
  text: string
): AssistantSearchState {
  if (state.provisionalGuests || state.countsCollected || state.guestsAny) return state;
  if (extractShorthandParty(text) || extractPartyComposition(text)) return state;
  const counts = extractGuestCounts(text);
  if (counts.length !== 1) return state;
  return { ...state, provisionalGuests: counts[0], guestsAny: false };
}

/** Aktif akış adımında cevabı işler; anlaşılmazsa aynı adım için tekrar sorar. */
export function processFlowStep(
  userText: string,
  state: AssistantSearchState,
  previousUserText?: string,
  now: Date = new Date()
): FlowAdvanceResult {
  if (isConversationGreeting(userText)) {
    const nextState = restartedConversationState(state);
    const nextStep = resolveFlowStep(nextState);
    return finishTurn(buildFlowReply(nextStep, nextState), nextState, false);
  }

  const pendingReply = takeConfirmReply(userText, state);
  if (pendingReply) return pendingReply;

  const outsidePlace = unknownServicePlace(userText, resolveFlowStep(state));
  if (outsidePlace) {
    const updated = applyCriterionUpdate(state, userText);
    const known = regionHitsInText(userText).length > 0;
    return finishTurn(assistantOutsideServiceMessage(outsidePlace), known
      ? updated
      : {
          ...updated,
          regionSlugs: state.regionSlugs,
          regionAny: state.regionAny,
          regionTrail: state.regionTrail,
        }, false);
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

  const proposal = buildInferredConfirm(userText, now);
  if (proposal && !inferredAlreadySaved(state, proposal)) {
    const queue = [...(state.confirmQueue ?? [])];
    if (state.pendingConfirm && topicsDiffer(state.pendingConfirm, proposal)) {
      queue.unshift(state.pendingConfirm);
    }
    return finishTurn(proposal.question, {
      ...rememberPlainGuestCount(state, userText),
      pendingConfirm: proposal,
      confirmQueue: queue.length > 0 ? queue : undefined,
    }, false);
  }

  if (state.pendingConfirm || state.confirmQueue?.length) {
    state = { ...state, pendingConfirm: undefined, confirmQueue: undefined };
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
      const settled = withPairAdults(nextState);
      const nextStep = resolveFlowStep(settled);
      return finishTurn(
        nextStep === "ready"
          ? "Seçenekleri inceliyorum, uygun olanları size sunacağım."
          : buildFlowReply(nextStep, settled),
        settled,
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
      const settled = step === "awaiting_party_detail" ? indifferent : withPairAdults(indifferent);
      const nextStep = resolveFlowStep(settled);
      return finishTurn(
        nextStep === "ready"
          ? "Seçenekleri inceliyorum, uygun olanları size sunacağım."
          : buildFlowReply(nextStep, settled),
        settled,
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
    const nextState: AssistantSearchState = withPairAdults({
      ...updated,
      helpAsked: true,
      sentVillaIds: [],
      moreOptionRounds: 0,
    });
    const nextStep = resolveFlowStep(nextState);
    return finishTurn(
      nextStep === "ready"
        ? "Seçenekleri inceliyorum, uygun olanları size sunacağım."
        : buildFlowReply(nextStep, nextState),
      nextState,
      nextStep === "ready"
    );
  }

  let answer = userText;
  let answerState = state;
  if (step === "awaiting_party_detail") {
    const prepared = preparePartyDetailAnswer(userText, state, previousUserText);
    if (prepared.hold) return finishTurn(prepared.reply, prepared.state, false);
    answer = prepared.text;
    answerState = prepared.state;
  }

  const harvested = harvestKnownSlots(answer, answerState);
  if (slotsChanged(answerState, harvested)) {
    const settled = step === "awaiting_party_detail" ? harvested : withPairAdults(harvested);
    const nextStep = resolveFlowStep(settled);
    return finishTurn(
      nextStep === "ready"
        ? buildFlowReply("ready", settled)
        : buildProgressReply(answerState, settled, nextStep),
      settled,
      nextStep === "ready"
    );
  }

  const parsed = tryParseStep(step, answer, answerState);
  if (parsed) return finishTurn(parsed.reply, parsed.state, parsed.readyToSearch);

  return finishTurn(buildRetryReply(step, answerState), answerState, false);
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
  state: AssistantSearchState,
  previousUserText?: string
): FlowAdvanceResult {
  return processFlowStep(userText, state, previousUserText);
}
