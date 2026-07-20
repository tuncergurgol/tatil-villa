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
  tem: 7,
  temmuz: 7,
  agu: 8,
  ağu: 8,
  agustos: 8,
  ağustos: 8,
  eyl: 9,
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
  /\b(kapat\w*|kapal[ıi]\w*|dol(?:u|du|dur)\w*|rezerv\w*|booked|full|kira(?:ya|lan\w*|land[ıi]|landik)?|sat[ıi]l\w*|bloke|blok\w*|tuttu\w*|tutuld\w*)\b/i;
const OPEN_KEYWORDS =
  /\b(a[cç][ıi]k\w*|a[cç]al[ıi]m|a[cç]t[ıi]k|a[cç][ıi]ld[ıi]|m[üu]sait\w*|bo[sş]\w*|available|serbest\w*|iptal\w*)\b/i;
const OPTION_KEYWORDS = /\b(ops(?:iyon)?\w*|option\w*|hold)\b/i;

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

/**
 * OCR / yazım: "2 1 Ağustos" → "21 Ağustos".
 * "7 10 ağustos" bozulmaz (ikinci rakam iki haneli).
 */
function joinSpacedDayDigits(text: string) {
  return text.replace(/\b(\d)\s+(\d)(?!\d)(?=\s+[a-z]+)/gi, (full, a, b) => {
    const day = Number(a) * 10 + Number(b);
    if (day >= 10 && day <= 31) return String(day);
    return full;
  });
}

function rangeFromSameMonthDays(options: {
  startDay: number;
  endDay: number;
  month: number;
  year?: number;
}) {
  const endYear = options.year ?? inferYear(options.month);
  const crossesMonth = options.startDay > options.endDay;
  const startMonth = crossesMonth
    ? options.month === 1
      ? 12
      : options.month - 1
    : options.month;
  const startYear = crossesMonth && options.month === 1 ? endYear - 1 : endYear;
  return {
    startDateKey: buildDateKey(startYear, startMonth, options.startDay),
    endDateKey: buildDateKey(endYear, options.month, options.endDay),
  };
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

  const monthName = trimmed.match(/^(\d{1,2})\s+([a-z]+)$/i);
  if (monthName) {
    const month = MONTHS[normalizeText(monthName[2])];
    if (!month) return null;
    return parseIsoDate({ day: Number(monthName[1]), month });
  }

  return null;
}

export function extractDateRange(text: string) {
  const normalized = joinSpacedDayDigits(
    normalizeText(text.replace(/\s+/g, " ").trim())
  );

  // "Giriş Tarihi: 21 Ağustos 2026 ... Çıkış Tarihi: 24 Ağustos 2026"
  const checkInOutLabeled = normalized.match(
    /giris\s*(?:tarihi)?\s*:?\s*(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?[\s\S]{0,120}?cikis\s*(?:tarihi)?\s*:?\s*(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/i
  );
  if (checkInOutLabeled) {
    const startMonth = MONTHS[checkInOutLabeled[2]];
    const endMonth = MONTHS[checkInOutLabeled[5]];
    if (startMonth && endMonth) {
      const startYear = checkInOutLabeled[3]
        ? Number(checkInOutLabeled[3])
        : inferYear(startMonth);
      const endYear = checkInOutLabeled[6]
        ? Number(checkInOutLabeled[6])
        : inferYear(endMonth);
      return {
        startDateKey: buildDateKey(
          startYear,
          startMonth,
          Number(checkInOutLabeled[1])
        ),
        endDateKey: buildDateKey(endYear, endMonth, Number(checkInOutLabeled[4])),
      };
    }
  }

  // "16 agustos giriş 20 agustos çıkış"
  const checkInOutInline = normalized.match(
    /(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\s+giris\b[\s\S]{0,40}?(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\s+cikis\b/i
  );
  if (checkInOutInline) {
    const startMonth = MONTHS[checkInOutInline[2]];
    const endMonth = MONTHS[checkInOutInline[5]];
    if (startMonth && endMonth) {
      const startYear = checkInOutInline[3]
        ? Number(checkInOutInline[3])
        : inferYear(startMonth);
      const endYear = checkInOutInline[6]
        ? Number(checkInOutInline[6])
        : inferYear(endMonth);
      return {
        startDateKey: buildDateKey(
          startYear,
          startMonth,
          Number(checkInOutInline[1])
        ),
        endDateKey: buildDateKey(endYear, endMonth, Number(checkInOutInline[4])),
      };
    }
  }

  // "Ağustos 8/15", "agustos 8-15 doldu"
  const monthFirstRange = normalized.match(
    /\b([a-z]+)\s+(\d{1,2})\s*(?:-|–|—|ile|ve|\/)\s*(\d{1,2})(?:\s+(\d{4}))?\b/i
  );
  if (monthFirstRange) {
    const month = MONTHS[monthFirstRange[1]];
    if (month) {
      return rangeFromSameMonthDays({
        startDay: Number(monthFirstRange[2]),
        endDay: Number(monthFirstRange[3]),
        month,
        year: monthFirstRange[4] ? Number(monthFirstRange[4]) : undefined,
      });
    }
  }

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
    /(\d{1,2})\s+([a-z]+)\s+(\d{1,2})\s+(?:aralig\w*|arasi\w*)/i
  );
  if (sameMonthRangeKeyword) {
    const month = MONTHS[sameMonthRangeKeyword[2]];
    if (month) {
      return rangeFromSameMonthDays({
        startDay: Number(sameMonthRangeKeyword[1]),
        endDay: Number(sameMonthRangeKeyword[3]),
        month,
      });
    }
  }

  // "6-12 eylül", "6/12 eylül", "6/12/ eylül", "10 ..16 ağustos".
  const monthRange = normalized.match(
    /(\d{1,2})\s*(?:-|–|—|ile|ve|\/|\.{2,})\s*(\d{1,2})(?:\s*[\/.-]\s*|\s+)([a-z]+)(?:\s+(\d{4}))?/i
  );
  if (monthRange) {
    const month = MONTHS[monthRange[3]];
    if (month) {
      return rangeFromSameMonthDays({
        startDay: Number(monthRange[1]),
        endDay: Number(monthRange[2]),
        month,
        year: monthRange[4] ? Number(monthRange[4]) : undefined,
      });
    }
  }

  // "7 10 ağustos", "15 20 temmuz" (tire/slash yok, boşlukla iki gün)
  const spacedDayMonthRange = normalized.match(
    /\b(\d{1,2})\s+(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/i
  );
  if (spacedDayMonthRange) {
    const month = MONTHS[spacedDayMonthRange[3]];
    if (month) {
      return rangeFromSameMonthDays({
        startDay: Number(spacedDayMonthRange[1]),
        endDay: Number(spacedDayMonthRange[2]),
        month,
        year: spacedDayMonthRange[4] ? Number(spacedDayMonthRange[4]) : undefined,
      });
    }
  }

  // İki tam tarih: "21 temmuz 22 temmuz", "21 temmuz - 22 temmuz",
  // "30 temmuz 2 ağustos" (tire opsiyonel, aylar farklı olabilir).
  const twoMonthDay = normalized.match(
    /(\d{1,2})\s+([a-z]+)\s*(?:-|–|—|ile|ve|\/)?\s*(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/i
  );
  if (twoMonthDay) {
    const startMonth = MONTHS[twoMonthDay[2]];
    const endMonth = MONTHS[twoMonthDay[4]];
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
    /\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/i
  );
  if (singleMonthDay) {
    const month = MONTHS[singleMonthDay[2]];
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

/**
 * Intent mevcut mesajdan, tarih yoksa alıntılanan / bağlam mesajından alınır.
 * Örn. yanıt: "kiraya verildi, kapatalım" + alıntı: "22-25 ağu opsiyon"
 */
export function parseWhatsappCalendarMessage(
  rawBody: string,
  rules?: WhatsappCalendarPhraseRuleInput[],
  contextBody?: string
): ParsedWhatsappCalendarMessage | null {
  const body = rawBody.trim();
  if (!body) return null;

  const detected = detectIntent(body, rules);
  if (!detected) return null;

  const range =
    extractDateRange(body) ??
    (contextBody?.trim() ? extractDateRange(contextBody.trim()) : null);
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

  const dateSource = normalizeText(`${body} ${contextBody ?? ""}`);

  return {
    intent: detected.intent,
    startDateKey: start,
    endDateKey: end,
    confidence:
      /(\d{1,2}[./-]\d{1,2}|\d{1,2}\s*[-–—\/]\s*\d{1,2}|giris|cikis)/.test(
        dateSource
      )
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

/** Admin UI ve seed için bilinen örnek mesaj kalıpları */
export const WHATSAPP_CALENDAR_MESSAGE_EXAMPLES: Array<{
  phrase: string;
  intent: WhatsappCalendarIntent;
  sample: string;
}> = [
  {
    phrase: "doldu",
    intent: "CLOSE",
    sample: "Ağustos 8/15 doldu",
  },
  {
    phrase: "satılmıştır",
    intent: "CLOSE",
    sample: "7 10 ağustos satılmıştır",
  },
  {
    phrase: "kapatıldı",
    intent: "CLOSE",
    sample:
      "Giriş Tarihi: 2 1 Ağustos 2026 Cuma - Saat: 21:00 Çıkış Tarihi: 2 4 Ağustos 2026 Pazartesi - Saat: 12:00 Konaklama Süresi: 3 Gece / 4 Gün Villa Karya kapatıldı",
  },
  {
    phrase: "kapatabilir misiniz",
    intent: "CLOSE",
    sample:
      "SN grup üyeleri 16 agustos giriş 20 agustos çıkış rezervasyon yapılmistir. Kapatabilir misiniz? Lütfen",
  },
  {
    phrase: "rezervasyon yapılmıştır",
    intent: "CLOSE",
    sample: "16 agustos giriş 20 agustos çıkış rezervasyon yapılmıştır",
  },
];
