import { compareDates, parseDateKey, toDateKey } from "@/lib/villa-period-calendar";

export type WhatsappCalendarIntent = "OPEN" | "CLOSE" | "OPTION";

export type ParsedWhatsappCalendarMessage = {
  intent: WhatsappCalendarIntent;
  startDateKey: string;
  endDateKey: string;
  confidence: "high" | "low";
  summary: string;
};

const MONTHS: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  subat: 2,
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

// Kökleri baz alır; Türkçe çekimleri (kapatalım, kapattık, açalım, doldu...) yakalar.
const CLOSE_KEYWORDS =
  /\b(kapat\w*|kapal[ıi]\w*|dol(?:u|du|dur)\w*|rezerv\w*|booked|full|kiralan\w*|bloke|blok\w*|tuttu\w*|tutuld\w*)\b/i;
const OPEN_KEYWORDS =
  /\b(a[cç][ıi]k\w*|a[cç]al[ıi]m|a[cç]t[ıi]k|a[cç][ıi]ld[ıi]|m[üu]sait\w*|bo[sş]\w*|available|serbest\w*|iptal\w*)\b/i;
const OPTION_KEYWORDS = /\b(opsiyon\w*|option\w*|hold)\b/i;

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function detectIntent(text: string): WhatsappCalendarIntent | null {
  if (OPTION_KEYWORDS.test(text)) return "OPTION";
  if (CLOSE_KEYWORDS.test(text)) return "CLOSE";
  if (OPEN_KEYWORDS.test(text)) return "OPEN";
  return null;
}

function buildDateKey(year: number, month: number, day: number) {
  return toDateKey(new Date(year, month - 1, day));
}

function inferYear(month: number, reference = new Date()) {
  const year = reference.getFullYear();
  const currentMonth = reference.getMonth() + 1;
  if (month < currentMonth - 1) return year + 1;
  return year;
}

function parseIsoDate(parts: { day: number; month: number; year?: number }) {
  const year = parts.year ?? inferYear(parts.month);
  return buildDateKey(year, parts.month, parts.day);
}

function parseDateToken(token: string, fallbackMonth?: number, fallbackYear?: number) {
  const trimmed = token.trim();

  const iso = trimmed.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (iso) {
    const day = Number(iso[1]);
    const month = Number(iso[2]);
    const year = iso[3]
      ? Number(iso[3].length === 2 ? `20${iso[3]}` : iso[3])
      : fallbackYear ?? inferYear(month);
    return buildDateKey(year, month, day);
  }

  const dayOnly = trimmed.match(/^(\d{1,2})$/);
  if (dayOnly && fallbackMonth) {
    const year = fallbackYear ?? inferYear(fallbackMonth);
    return buildDateKey(year, fallbackMonth, Number(dayOnly[1]));
  }

  const monthName = trimmed.match(/^(\d{1,2})\s+([a-zçğıöşü]+)$/i);
  if (monthName) {
    const month = MONTHS[normalizeText(monthName[2])];
    if (!month) return null;
    return parseIsoDate({ day: Number(monthName[1]), month });
  }

  return null;
}

function extractDateRange(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  const betweenIso = normalized.match(
    /(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)\s*(?:-|–|—|ile|ve|\/)\s*(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/i
  );
  if (betweenIso) {
    const start = parseDateToken(betweenIso[1]);
    const end = parseDateToken(betweenIso[2]);
    if (start && end) return { startDateKey: start, endDateKey: end };
  }

  const monthRange = normalized.match(
    /(\d{1,2})\s*(?:-|–|—|ile|ve|\/)\s*(\d{1,2})\s+([a-zçğıöşü]+)(?:\s+(\d{4}))?/i
  );
  if (monthRange) {
    const month = MONTHS[normalizeText(monthRange[3])];
    if (month) {
      const year = monthRange[4]
        ? Number(monthRange[4])
        : inferYear(month);
      const start = buildDateKey(year, month, Number(monthRange[1]));
      const end = buildDateKey(year, month, Number(monthRange[2]));
      return { startDateKey: start, endDateKey: end };
    }
  }

  const monthRangeRepeat = normalized.match(
    /(\d{1,2})\s+([a-zçğıöşü]+)\s*(?:-|–|—|ile|ve|\/)\s*(\d{1,2})\s+\2(?:\s+(\d{4}))?/i
  );
  if (monthRangeRepeat) {
    const month = MONTHS[normalizeText(monthRangeRepeat[2])];
    if (month) {
      const year = monthRangeRepeat[4]
        ? Number(monthRangeRepeat[4])
        : inferYear(month);
      const start = buildDateKey(year, month, Number(monthRangeRepeat[1]));
      const end = buildDateKey(year, month, Number(monthRangeRepeat[3]));
      return { startDateKey: start, endDateKey: end };
    }
  }

  const singleMonthDay = normalized.match(
    /\b(\d{1,2})\s+([a-zçğıöşü]+)(?:\s+(\d{4}))?\b/i
  );
  if (singleMonthDay) {
    const month = MONTHS[normalizeText(singleMonthDay[2])];
    if (month) {
      const year = singleMonthDay[3]
        ? Number(singleMonthDay[3])
        : inferYear(month);
      const dateKey = buildDateKey(year, month, Number(singleMonthDay[1]));
      return { startDateKey: dateKey, endDateKey: dateKey };
    }
  }

  const singleIso = normalized.match(/\b(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)\b/);
  if (singleIso) {
    const dateKey = parseDateToken(singleIso[1]);
    if (dateKey) return { startDateKey: dateKey, endDateKey: dateKey };
  }

  return null;
}

export function parseWhatsappCalendarMessage(
  rawBody: string
): ParsedWhatsappCalendarMessage | null {
  const body = rawBody.trim();
  if (!body) return null;

  const intent = detectIntent(body);
  if (!intent) return null;

  const range = extractDateRange(body);
  if (!range) return null;

  const { start, end } = range.startDateKey <= range.endDateKey
    ? { start: range.startDateKey, end: range.endDateKey }
    : { start: range.endDateKey, end: range.startDateKey };

  if (compareDates(parseDateKey(start), parseDateKey(end)) > 0) {
    return null;
  }

  const intentLabel =
    intent === "OPEN" ? "Aç" : intent === "CLOSE" ? "Kapat" : "Opsiyon";

  return {
    intent,
    startDateKey: start,
    endDateKey: end,
    confidence: /(\d{1,2}[./-]\d{1,2}|\d{1,2}\s*-\s*\d{1,2})/.test(body)
      ? "high"
      : "low",
    summary: `${intentLabel}: ${start} → ${end}`,
  };
}

export function mapIntentToOccupancyMode(
  intent: WhatsappCalendarIntent
): "EMPTY" | "BOOKED" | "OPTION" {
  if (intent === "OPEN") return "EMPTY";
  if (intent === "OPTION") return "OPTION";
  return "BOOKED";
}
