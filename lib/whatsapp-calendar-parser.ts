import { compareDates, parseDateKey, toDateKey } from "@/lib/villa-period-calendar";

export type WhatsappCalendarIntent = "OPEN" | "CLOSE" | "OPTION";

export type WhatsappCalendarPhraseRuleInput = {
  phrase: string;
  intent: WhatsappCalendarIntent;
};

export type ParsedWhatsappCalendarMessage = {
  intent: WhatsappCalendarIntent;
  startDateKey: string;
  endDateKey: string;
  confidence: "high" | "low";
  summary: string;
  matchedPhrase?: string;
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

export function normalizeWhatsappCalendarText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function normalizeText(value: string) {
  return normalizeWhatsappCalendarText(value);
}

function detectBuiltinIntent(text: string): WhatsappCalendarIntent | null {
  if (OPTION_KEYWORDS.test(text)) return "OPTION";
  if (CLOSE_KEYWORDS.test(text)) return "CLOSE";
  if (OPEN_KEYWORDS.test(text)) return "OPEN";
  return null;
}

/** Kullanıcı kuralları önce; en uzun eşleşen ifade kazanır. */
export function detectIntentFromPhraseRules(
  text: string,
  rules: WhatsappCalendarPhraseRuleInput[]
): { intent: WhatsappCalendarIntent; phrase: string } | null {
  if (rules.length === 0) return null;

  const normalizedBody = normalizeText(text);
  let best: { intent: WhatsappCalendarIntent; phrase: string; length: number } | null =
    null;

  for (const rule of rules) {
    const phrase = rule.phrase.trim();
    if (!phrase) continue;
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) continue;
    if (!normalizedBody.includes(normalizedPhrase)) continue;
    if (!best || normalizedPhrase.length > best.length) {
      best = {
        intent: rule.intent,
        phrase,
        length: normalizedPhrase.length,
      };
    }
  }

  return best
    ? { intent: best.intent, phrase: best.phrase }
    : null;
}

function detectIntent(
  text: string,
  rules?: WhatsappCalendarPhraseRuleInput[]
): { intent: WhatsappCalendarIntent; matchedPhrase?: string } | null {
  const fromRules = detectIntentFromPhraseRules(text, rules ?? []);
  if (fromRules) {
    return { intent: fromRules.intent, matchedPhrase: fromRules.phrase };
  }

  const builtin = detectBuiltinIntent(text);
  if (!builtin) return null;
  return { intent: builtin };
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

  // "18 agustos 23 aralığı", "18 ağustos 23 arası" → aynı ay içinde 18-23 aralığı.
  // "aralığı/aralığında/arası" burada tarih aralığı belirtir; Aralık ayı DEĞİLDİR.
  const sameMonthRangeKeyword = normalized.match(
    /(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{1,2})\s+(?:aral[ıi][ğg]\w*|aras[ıi]\w*)/i
  );
  if (sameMonthRangeKeyword) {
    const month = MONTHS[normalizeText(sameMonthRangeKeyword[2])];
    if (month) {
      const year = inferYear(month);
      const start = buildDateKey(year, month, Number(sameMonthRangeKeyword[1]));
      const end = buildDateKey(year, month, Number(sameMonthRangeKeyword[3]));
      return { startDateKey: start, endDateKey: end };
    }
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

  // İki tam tarih: "21 temmuz 22 temmuz", "21 temmuz - 22 temmuz",
  // "30 temmuz 2 ağustos" (tire opsiyonel, aylar farklı olabilir).
  const twoMonthDay = normalized.match(
    /(\d{1,2})\s+([a-zçğıöşü]+)\s*(?:-|–|—|ile|ve|\/)?\s*(\d{1,2})\s+([a-zçğıöşü]+)(?:\s+(\d{4}))?/i
  );
  if (twoMonthDay) {
    const startMonth = MONTHS[normalizeText(twoMonthDay[2])];
    const endMonth = MONTHS[normalizeText(twoMonthDay[4])];
    if (startMonth && endMonth) {
      const explicitYear = twoMonthDay[5] ? Number(twoMonthDay[5]) : undefined;
      const startYear = explicitYear ?? inferYear(startMonth);
      const endYear = explicitYear ?? inferYear(endMonth);
      const start = buildDateKey(startYear, startMonth, Number(twoMonthDay[1]));
      const end = buildDateKey(endYear, endMonth, Number(twoMonthDay[3]));
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
  rawBody: string,
  rules?: WhatsappCalendarPhraseRuleInput[]
): ParsedWhatsappCalendarMessage | null {
  const body = rawBody.trim();
  if (!body) return null;

  const detected = detectIntent(body, rules);
  if (!detected) return null;

  const range = extractDateRange(body);
  if (!range) return null;

  const { start, end } = range.startDateKey <= range.endDateKey
    ? { start: range.startDateKey, end: range.endDateKey }
    : { start: range.endDateKey, end: range.startDateKey };

  if (compareDates(parseDateKey(start), parseDateKey(end)) > 0) {
    return null;
  }

  const intentLabel =
    detected.intent === "OPEN"
      ? "Aç"
      : detected.intent === "CLOSE"
        ? "Kapat"
        : "Opsiyon";

  return {
    intent: detected.intent,
    startDateKey: start,
    endDateKey: end,
    confidence: /(\d{1,2}[./-]\d{1,2}|\d{1,2}\s*-\s*\d{1,2})/.test(body)
      ? "high"
      : "low",
    summary: `${intentLabel}: ${start} → ${end}`,
    matchedPhrase: detected.matchedPhrase,
  };
}

export function mapIntentToOccupancyMode(
  intent: WhatsappCalendarIntent
): "EMPTY" | "BOOKED" | "OPTION" {
  if (intent === "OPEN") return "EMPTY";
  if (intent === "OPTION") return "OPTION";
  return "BOOKED";
}

export const WHATSAPP_CALENDAR_INTENT_LABELS: Record<
  WhatsappCalendarIntent,
  string
> = {
  CLOSE: "Kapat (Dolu)",
  OPEN: "Aç (Müsait)",
  OPTION: "Opsiyon",
};
