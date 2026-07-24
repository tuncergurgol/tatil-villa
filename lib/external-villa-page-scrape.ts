/**
 * Public villa sayfalarından (HTML / site AJAX) fiyat periyodu + müsaitlik çeker.
 * API verilmez; ajans olarak public sayfayı okur.
 *
 * Destek:
 * - heryervillam.com (HTML fiyat tablosu + takvim)
 * - villavillam.com.tr (NEXT_DATA id + api.villavillam.com.tr PriceList/Availability)
 * - villakalkan.com.tr (Nuxt __NUXT__ price_list_1 + calendar)
 * - yazlikvillaci.com.tr (pricingTable2 + /calendar müsaitlik)
 * - dalvillalari.com / Boceksoft (HTML dönem + POST /ajax/villatarih)
 * - risusvillatatili.com / KVT (pricing-item + fake-calendar villatarih)
 * - Benzer Next.js villa siteleri (__NEXT_DATA__ period/booking anahtarları)
 * - Genel HTML: data-price + tarih aralığı
 */

import type { VillaDayOccupancy, VillaPeriodCurrency } from "@prisma/client";
import {
  calculateDiscountAmounts,
  deriveNightlyFromWeekly,
  deriveWeeklyFromNightly,
} from "@/lib/villa-period-pricing";
import {
  compareDates,
  parseDateKey,
  startOfDay,
  toDateKey,
} from "@/lib/villa-period-calendar";
import type { MappedVillaPricePeriod } from "@/lib/tatildeyiz-period-import";
import { sleep } from "@/lib/tatildeyiz-gallery";

export type ScrapedVillaPage = {
  sourceHost: string;
  strategy:
    | "boceksoft"
    | "next_data"
    | "html_periods"
    | "heryervillam"
    | "villavillam"
    | "villakalkan"
    | "yazlikvillaci"
    | "kvt";
  pageTitle: string | null;
  periods: MappedVillaPricePeriod[];
  occupancyByDateKey: Map<string, VillaDayOccupancy>;
  warnings: string[];
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const FETCH_HEADERS: HeadersInit = {
  "User-Agent": BROWSER_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
};

/** Sayfalar arası / AJAX arası nazik bekleme. */
export const EXTERNAL_PAGE_SCRAPE_DELAY_MS = 400;

const TURKISH_MONTHS: Record<string, number> = {
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

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function normalizeLooseDateKey(raw: string): string | null {
  const trimmed = raw.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = iso[1]!;
    const m = iso[2]!.padStart(2, "0");
    const d = iso[3]!.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const dmy = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  }
  return null;
}

function parseTurkishLongDate(raw: string): Date | null {
  const text = decodeHtmlEntities(raw)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const m = text.match(
    /^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})$/u
  );
  if (!m) return null;

  const day = Number(m[1]);
  const monthName = m[2]!.toLocaleLowerCase("tr-TR");
  const year = Number(m[3]);
  let month = TURKISH_MONTHS[monthName];
  if (!month) {
    const abbrev = monthName.slice(0, 3);
    month =
      TURKISH_MONTHS[abbrev] ??
      Object.entries(TURKISH_MONTHS).find(([name]) => name.startsWith(abbrev))?.[1];
  }
  if (!month || !Number.isFinite(day) || !Number.isFinite(year)) return null;

  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return parseDateKey(key);
}

function parseTurkishDateRange(raw: string): { start: Date; end: Date } | null {
  const text = decodeHtmlEntities(raw)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;
  const start = parseTurkishLongDate(parts[0]!);
  const end = parseTurkishLongDate(parts[1]!);
  if (!start || !end || compareDates(start, end) > 0) return null;
  return { start, end };
}

function mapCurrencyCode(raw: string | null | undefined): VillaPeriodCurrency {
  const value = (raw ?? "tl").toLowerCase();
  if (value === "eur" || value === "euro" || value === "€") return "EUR";
  if (value === "usd" || value === "dolar" || value === "$") return "USD";
  if (value === "gbp" || value === "pound" || value === "£") return "GBP";
  return "TL";
}

function positiveInt(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/** `46,200.00` (US), `46.200,00` (TR) veya `46857,142857` (Boceksoft) → number */
function parseLocalizedMoney(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;
  if (/\d\.\d{2}$/.test(s) && s.includes(",")) {
    return Number(s.replace(/,/g, ""));
  }
  // Ondalık virgül: 46857,1428571429 veya 46.200,00
  if (/^\d{1,3}(?:\.\d{3})*,\d+$/.test(s) || /^\d+,\d+$/.test(s)) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  if (/\d,\d{2}$/.test(s)) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  if (s.includes(",") && !s.includes(".")) {
    return Number(s.replace(/,/g, ""));
  }
  return Number(s.replace(/,/g, ""));
}

function buildMappedPeriod(input: {
  sourceId: number;
  startDate: Date;
  endDate: Date;
  nightlyPrice: number;
  currency?: VillaPeriodCurrency;
  weeklyPrice?: number | null;
  minStayNights?: number | null;
  damageDeposit?: number | null;
  damageDepositCurrency?: VillaPeriodCurrency;
  discount1Rate?: number | null;
}): MappedVillaPricePeriod {
  const nightlyPrice = positiveInt(input.nightlyPrice) ?? 0;
  const discount1Rate = positiveInt(input.discount1Rate);
  const preview = calculateDiscountAmounts(
    nightlyPrice,
    discount1Rate ?? 0,
    0,
    0
  );
  const currency = input.currency ?? "TL";
  const depositCurrency = input.damageDepositCurrency ?? currency;

  return {
    sourceId: input.sourceId,
    startDate: startOfDay(input.startDate),
    endDate: startOfDay(input.endDate),
    availability: "available",
    nightlyPrice,
    nightlyPriceCurrency: currency,
    weeklyPrice:
      positiveInt(input.weeklyPrice) ?? deriveWeeklyFromNightly(nightlyPrice),
    prepaymentRate: null,
    commissionRate: null,
    nightlyPriceWithoutCommission: null,
    discountedNightlyPrice: preview.discountedNightlyPrice,
    minStayNights: positiveInt(input.minStayNights),
    cleaningDayCount: null,
    cleaningFee: null,
    cleaningFeeCurrency: currency,
    damageDeposit: positiveInt(input.damageDeposit),
    damageDepositCurrency: depositCurrency,
    petCleaningFee: null,
    petCleaningFeeCurrency: currency,
    petDamageDeposit: null,
    petDamageDepositCurrency: currency,
    underfloorHeatingFee: null,
    underfloorHeatingFeeCurrency: currency,
    extraBedFee: null,
    extraBedFeeCurrency: currency,
    poolHeatingPrivateFee: null,
    poolHeatingPrivateFeeCurrency: currency,
    poolHeatingIndoorFee: null,
    poolHeatingIndoorFeeCurrency: currency,
    poolHeatingKidsFee: null,
    poolHeatingKidsFeeCurrency: currency,
    discount1Rate,
    discount2Rate: null,
    extraDiscountAmount: null,
    weekendPrice: null,
    weekendDays: [],
    weekendMinStayNights: null,
    childFee02: null,
    childFee02Currency: currency,
    childFee03_09: null,
    childFee03_09Currency: currency,
  };
}

async function fetchText(
  url: string,
  options?: { method?: string; body?: string; referer?: string }
): Promise<string> {
  const headers: Record<string, string> = {
    ...(FETCH_HEADERS as Record<string, string>),
  };
  if (options?.referer) headers.Referer = options.referer;
  if (options?.body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
  }

  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body,
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status}): ${url}`);
  }

  return response.text();
}

function extractPageTitle(html: string): string | null {
  const og = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  if (og?.[1]) return decodeHtmlEntities(og[1]).trim();
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return title?.[1] ? decodeHtmlEntities(title[1]).trim() : null;
}

function extractDamageDeposit(html: string): {
  amount: number | null;
  currency: VillaPeriodCurrency;
} {
  const text = stripTags(html);
  const m = text.match(
    /hasar\s*depozitosu[^0-9]{0,40}(\d[\d.\s]*)\s*(TL|EUR|USD|GBP|€|\$|£)?/i
  );
  if (!m) return { amount: null, currency: "TL" };
  const amount = positiveInt(Number((m[1] ?? "").replace(/[.\s]/g, "")));
  return { amount, currency: mapCurrencyCode(m[2]) };
}

/** Boceksoft / dalvillalari dönem listesi (data-year + data-price). */
export function parseBoceksoftPeriodList(
  html: string,
  damageDeposit?: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  const liRe =
    /<li\b[^>]*\bdata-year=["'][^"']+["'][^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  let sourceId = 1;

  while ((match = liRe.exec(html)) !== null) {
    const block = match[1] ?? "";
    const strong = block.match(/<strong>([\s\S]*?)<\/strong>/i);
    if (!strong?.[1]) continue;
    const rangeText = stripTags(strong[1]);
    // Para birimi seçicisi / başlık strong'larını atla
    if (!/\d{4}/.test(rangeText) || !/-/.test(rangeText)) continue;

    const range = parseTurkishDateRange(rangeText);
    if (!range) continue;

    const nightlyMatch = block.match(
      /data-t-show-price=["'][^"']*(?:g[uü]nl[uü]k|gecelik)[^"']*["'][^>]*data-doviz=["']([^"']+)["'][^>]*data-price=["'](\d+)["']/i
    );
    const nightlyAlt = block.match(
      /data-label=["']Gecelik["'][^>]*data-doviz=["']([^"']+)["'][^>]*data-price=["'](\d+)["']/i
    );
    const priceHit = nightlyMatch ?? nightlyAlt;
    if (!priceHit) continue;

    const currency = mapCurrencyCode(priceHit[1]);
    const nightlyPrice = Number(priceHit[2]);
    if (!Number.isFinite(nightlyPrice) || nightlyPrice <= 0) continue;

    const weeklyMatch = block.match(
      /data-(?:t-show-price|label)=["'][^"']*Haftal[^"']*["'][^>]*data-price=["'](\d+)["']/i
    );
    const minStayMatch = block.match(/Minimum\s+Kiralama:\s*(\d+)\s*Gece/i);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice,
        currency,
        weeklyPrice: weeklyMatch ? Number(weeklyMatch[1]) : null,
        minStayNights: minStayMatch ? Number(minStayMatch[1]) : null,
        damageDeposit: damageDeposit?.amount ?? null,
        damageDepositCurrency: damageDeposit?.currency ?? currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

/**
 * Boceksoft detay (kiralikvilladatatil vb.): `.price-range-hover` satırları —
 * tarih aralığı + data-label="Gecelik" / "Haftalık".
 */
export function parseBoceksoftPriceRangeRows(
  html: string,
  damageDeposit?: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  const seen = new Set<string>();
  let sourceId = 1;

  const chunks = html.split(
    /<div[^>]*class=["'][^"']*\bprice-range-hover\b[^"']*["'][^>]*>/i
  );

  for (let i = 1; i < chunks.length; i++) {
    const block = (chunks[i] ?? "").slice(0, 4000);
    const text = stripTags(block);
    const rangeMatch = text.match(
      /(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})\s*[-–—]\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})/u
    );
    if (!rangeMatch) continue;
    const range = parseTurkishDateRange(
      `${rangeMatch[1]} - ${rangeMatch[2]}`
    );
    if (!range) continue;

    const nightlyTag =
      block.match(
        /<[^>]+data-(?:t-show-price|label)=["'][^"']*(?:g[uü]nl[uü]k|Gecelik)[^"']*["'][^>]*>/i
      )?.[0] ??
      block.match(/<[^>]+data-price=["'][^"']+["'][^>]*>/i)?.[0];
    if (!nightlyTag) continue;

    const currency = mapCurrencyCode(
      nightlyTag.match(/data-doviz=["']([^"']+)["']/i)?.[1]
    );
    const priceRaw = nightlyTag.match(/data-price=["']([^"']+)["']/i)?.[1];
    if (!priceRaw) continue;
    const nightlyPrice = Math.round(parseLocalizedMoney(priceRaw));
    if (!Number.isFinite(nightlyPrice) || nightlyPrice <= 0) continue;

    const weeklyMatch = block.match(
      /data-(?:t-show-price|label)=["'][^"']*Haftal[^"']*["'][^>]*data-price=["']([^"']+)["']/i
    );
    const weeklyRaw = weeklyMatch
      ? Math.round(parseLocalizedMoney(weeklyMatch[1]!))
      : null;

    const minStayMatch =
      text.match(/En\s+az\s+(\d+)\s*Gece/i) ??
      text.match(/Minimum\s+Kiralama:\s*(\d+)\s*Gece/i);

    const key = `${toDateKey(range.start)}_${toDateKey(range.end)}_${nightlyPrice}`;
    if (seen.has(key)) continue;
    seen.add(key);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice,
        currency,
        weeklyPrice: weeklyRaw && weeklyRaw > 0 ? weeklyRaw : null,
        minStayNights: minStayMatch ? Number(minStayMatch[1]) : null,
        damageDeposit: damageDeposit?.amount ?? null,
        damageDepositCurrency: damageDeposit?.currency ?? currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

function extractBoceksoftCalendarMeta(html: string): {
  villaId: string | null;
  doviz: string;
} {
  const cal = html.match(
    /<div[^>]+id=["']calendar["'][^>]*data-id=["']([^"']+)["'][^>]*>/i
  );
  const doviz =
    html.match(/id=["']calendar["'][^>]*data-doviz=["']([^"']+)["']/i)?.[1] ??
    "tl";
  return { villaId: cal?.[1] ?? null, doviz };
}

function parseCsvDateKeys(chunk: string): string[] {
  if (!chunk.trim()) return [];
  const keys: string[] = [];
  for (const part of chunk.split(",")) {
    const key = normalizeLooseDateKey(part);
    if (key) keys.push(key);
  }
  return keys;
}

/**
 * Boceksoft POST /ajax/villatarih yanıtı:
 * giris##cikis##dolu##Rgiris##Rcikis##bekleyen##saatler##activedays##fiyatTarih##fiyat##...
 */
export function parseBoceksoftVillatarihResponse(
  body: string
): Map<string, VillaDayOccupancy> {
  const parts = body.split("##");
  const map = new Map<string, VillaDayOccupancy>();

  const mark = (keys: string[], status: VillaDayOccupancy) => {
    for (const key of keys) {
      if (status === "OPTION" && map.get(key) === "BOOKED") continue;
      if (status === "BOOKED") map.set(key, "BOOKED");
      else if (!map.has(key) || map.get(key) !== "BOOKED") map.set(key, status);
    }
  };

  // Check-in gecesi + ara dolu geceler BOOKED; çıkış sabahı boş bırakılır.
  mark(parseCsvDateKeys(parts[0] ?? ""), "BOOKED");
  mark(parseCsvDateKeys(parts[2] ?? ""), "BOOKED");
  mark(parseCsvDateKeys(parts[5] ?? ""), "OPTION");

  return map;
}

/** Günlük fiyat listesinden ardışık aynı fiyatları periyoda birleştir (yedek). */
export function collapseDailyPricesToPeriods(
  dateKeys: string[],
  prices: number[],
  currency: VillaPeriodCurrency = "TL"
): MappedVillaPricePeriod[] {
  if (dateKeys.length === 0 || dateKeys.length !== prices.length) return [];

  const periods: MappedVillaPricePeriod[] = [];
  let runStart = 0;

  const flush = (endIdx: number) => {
    const price = prices[runStart]!;
    if (!price || price <= 0) return;
    periods.push(
      buildMappedPeriod({
        sourceId: periods.length + 1,
        startDate: parseDateKey(dateKeys[runStart]!),
        endDate: parseDateKey(dateKeys[endIdx]!),
        nightlyPrice: price,
        currency,
      })
    );
  };

  for (let i = 1; i < dateKeys.length; i++) {
    const prev = parseDateKey(dateKeys[i - 1]!);
    const cur = parseDateKey(dateKeys[i]!);
    const expectedNext = new Date(prev);
    expectedNext.setDate(expectedNext.getDate() + 1);
    const contiguous =
      toDateKey(expectedNext) === toDateKey(cur) && prices[i] === prices[runStart];
    if (!contiguous) {
      flush(i - 1);
      runStart = i;
    }
  }
  flush(dateKeys.length - 1);
  return periods;
}

function parseNextDataJson(html: string): unknown | null {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf("</script>", jsonStart);
  if (jsonEnd === -1) return null;
  try {
    return JSON.parse(html.slice(jsonStart, jsonEnd));
  } catch {
    return null;
  }
}

function deepFindArrays(
  root: unknown,
  predicate: (items: unknown[]) => boolean,
  limit = 8
): unknown[][] {
  const found: unknown[][] = [];
  const seen = new Set<unknown>();

  const walk = (node: unknown, depth: number) => {
    if (found.length >= limit || node == null || depth > 12) return;
    if (typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      if (node.length > 0 && predicate(node)) found.push(node);
      for (const item of node) walk(item, depth + 1);
      return;
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      walk(value, depth + 1);
    }
  };

  walk(root, 0);
  return found;
}

function looksLikePeriodItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  const hasStart =
    typeof o.periodStart === "string" ||
    typeof o.startDate === "string" ||
    typeof o.start === "string" ||
    typeof o.beginDate === "string";
  const hasEnd =
    typeof o.periodEnd === "string" ||
    typeof o.endDate === "string" ||
    typeof o.end === "string" ||
    typeof o.finishDate === "string";
  const priceRaw =
    o.price ?? o.nightlyPrice ?? o.gunlukFiyat ?? o.gecelikFiyat ?? o.amount;
  const hasPrice =
    typeof priceRaw === "number" ||
    (typeof priceRaw === "string" && /\d/.test(priceRaw));
  return hasStart && hasEnd && hasPrice;
}

function looksLikeBookingItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  const hasIn =
    typeof o.checkIn === "string" ||
    typeof o.startDate === "string" ||
    typeof o.giris === "string" ||
    typeof o.from === "string";
  const hasOut =
    typeof o.checkOut === "string" ||
    typeof o.endDate === "string" ||
    typeof o.cikis === "string" ||
    typeof o.to === "string";
  return hasIn && hasOut;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function parseIsoLikeDate(value: string): Date | null {
  const key = normalizeLooseDateKey(value.slice(0, 10));
  if (key) return parseDateKey(key);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

export function parseNextDataPeriodsAndOccupancy(html: string): {
  periods: MappedVillaPricePeriod[];
  occupancyByDateKey: Map<string, VillaDayOccupancy>;
} | null {
  const data = parseNextDataJson(html);
  if (!data) return null;

  const periodArrays = deepFindArrays(data, (items) =>
    looksLikePeriodItem(items[0])
  );
  const bookingArrays = deepFindArrays(data, (items) =>
    looksLikeBookingItem(items[0])
  );

  const periods: MappedVillaPricePeriod[] = [];
  let sourceId = 1;
  for (const arr of periodArrays) {
    for (const raw of arr) {
      if (!looksLikePeriodItem(raw)) continue;
      const o = raw as Record<string, unknown>;
      const startRaw = pickString(o, [
        "periodStart",
        "startDate",
        "start",
        "beginDate",
      ]);
      const endRaw = pickString(o, [
        "periodEnd",
        "endDate",
        "end",
        "finishDate",
      ]);
      const price = pickNumber(o, [
        "price",
        "nightlyPrice",
        "gunlukFiyat",
        "gecelikFiyat",
        "amount",
      ]);
      if (!startRaw || !endRaw || !price) continue;
      const startDate = parseIsoLikeDate(startRaw);
      const endDate = parseIsoLikeDate(endRaw);
      if (!startDate || !endDate || compareDates(startDate, endDate) > 0) continue;
      periods.push(
        buildMappedPeriod({
          sourceId: sourceId++,
          startDate,
          endDate,
          nightlyPrice: price,
          minStayNights: pickNumber(o, [
            "minStayNights",
            "minimumStay",
            "minimumKonaklamaSuresi",
            "minNight",
          ]),
        })
      );
    }
    if (periods.length > 0) break;
  }

  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  for (const arr of bookingArrays) {
    for (const raw of arr) {
      if (!looksLikeBookingItem(raw)) continue;
      const o = raw as Record<string, unknown>;
      const checkIn = pickString(o, ["checkIn", "startDate", "giris", "from"]);
      const checkOut = pickString(o, ["checkOut", "endDate", "cikis", "to"]);
      if (!checkIn || !checkOut) continue;
      const start = parseIsoLikeDate(checkIn);
      const end = parseIsoLikeDate(checkOut);
      if (!start || !end) continue;
      const cursor = new Date(start);
      while (compareDates(cursor, end) < 0) {
        occupancyByDateKey.set(toDateKey(cursor), "BOOKED");
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    if (occupancyByDateKey.size > 0) break;
  }

  if (periods.length === 0 && occupancyByDateKey.size === 0) return null;
  return {
    periods: periods.sort((a, b) => compareDates(a.startDate, b.startDate)),
    occupancyByDateKey,
  };
}

/**
 * Heryervillam: `.fiyat-tablosu` satırlarından haftalık fiyat → gecelik,
 * `#rezervasyon` ay takvimlerinden müsaitlik (Rezerve / Müsait).
 */
export function parseHeryervillamPeriods(
  html: string
): MappedVillaPricePeriod[] {
  const deposit = extractDamageDeposit(html);
  const sectionMatch = html.match(
    /<div[^>]*class=["'][^"']*fiyat-tablosu[^"']*["'][^>]*>([\s\S]*?)(?:<div[^>]*id=["']rezervasyon["']|<\/aside>|<section|$)/i
  );
  const section = sectionMatch?.[1] ?? html;
  const periods: MappedVillaPricePeriod[] = [];
  const seen = new Set<string>();
  let sourceId = 1;

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(section)) !== null) {
    const row = rowMatch[1] ?? "";
    if (/<th\b/i.test(row)) continue;
    const text = stripTags(row);
    const rangeMatch = text.match(
      /(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})\s*[-–—]\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})/u
    );
    if (!rangeMatch) continue;

    const range = parseTurkishDateRange(
      `${rangeMatch[1]} - ${rangeMatch[2]}`
    );
    if (!range) continue;

    const priceMatch = text.match(
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+)\s*(?:TL|₺)/i
    );
    if (!priceMatch) continue;
    const weeklyPrice = parseLocalizedMoney(priceMatch[1]!);
    if (!Number.isFinite(weeklyPrice) || weeklyPrice <= 0) continue;

    const nightlyPrice = deriveNightlyFromWeekly(weeklyPrice);
    if (nightlyPrice <= 0) continue;

    const minStayMatch = text.match(
      /Minimum(?:\s*Kiralama)?\s*:?\s*(\d+)\s*Gece/i
    );
    const minStayNights = minStayMatch
      ? Number(minStayMatch[1])
      : null;

    const key = `${toDateKey(range.start)}_${toDateKey(range.end)}_${nightlyPrice}`;
    if (seen.has(key)) continue;
    seen.add(key);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice,
        weeklyPrice,
        currency: "TL",
        minStayNights,
        damageDeposit: deposit.amount,
        damageDepositCurrency: deposit.currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

/** `2026-007-13` veya `2026-08-04` → `2026-07-13` / `2026-08-04` */
function normalizeHeryervillamDateKey(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})-(\d{1,3})-(\d{1,2})$/);
  if (!m) return normalizeLooseDateKey(raw);
  const y = m[1]!;
  const monthNum = Number(m[2]);
  const dayNum = Number(m[3]);
  if (
    !Number.isFinite(monthNum) ||
    !Number.isFinite(dayNum) ||
    monthNum < 1 ||
    monthNum > 12 ||
    dayNum < 1 ||
    dayNum > 31
  ) {
    return null;
  }
  return `${y}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
}

export function parseHeryervillamOccupancy(
  html: string
): Map<string, VillaDayOccupancy> {
  const occupancy = new Map<string, VillaDayOccupancy>();
  const monthTables = [
    ...html.matchAll(
      /<th[^>]*colspan=["']7["'][^>]*>\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})\s*<\/th>([\s\S]*?)<\/table>/giu
    ),
  ];

  for (const match of monthTables) {
    const monthName = match[1]!.toLocaleLowerCase("tr-TR");
    const year = Number(match[2]);
    const month = TURKISH_MONTHS[monthName];
    const body = match[3] ?? "";
    if (!month || !Number.isFinite(year)) continue;

    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(body)) !== null) {
      const cell = cellMatch[1] ?? "";
      if (!cell.trim()) continue;

      const dataDate = cell.match(/data-date=["']([^"']+)["']/i)?.[1];
      const dayNumMatch =
        cell.match(/>(\d{1,2})<\/a>/i) ?? cell.match(/>(\d{1,2})</);
      const dayNum = dayNumMatch ? Number(dayNumMatch[1]) : NaN;

      let dateKey: string | null = null;
      if (dataDate) {
        dateKey = normalizeHeryervillamDateKey(dataDate);
      } else if (Number.isFinite(dayNum) && dayNum >= 1 && dayNum <= 31) {
        dateKey = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      }
      if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

      const title = (
        cell.match(/title=["']([^"']+)["']/i)?.[1] ?? ""
      ).toLocaleLowerCase("tr-TR");
      const isActive = /\bclass=["'][^"']*\bactive\b/i.test(cell);

      if (
        title.includes("rezerve") ||
        title.includes("dolu") ||
        (isActive && !title.includes("müsait") && !title.includes("musait"))
      ) {
        occupancy.set(dateKey, "BOOKED");
      } else if (
        title.includes("müsait") ||
        title.includes("musait") ||
        title.includes("başlangıç") ||
        title.includes("baslangic") ||
        title.includes("bitiş") ||
        title.includes("bitis")
      ) {
        if (!occupancy.has(dateKey)) occupancy.set(dateKey, "EMPTY");
      }
    }
  }

  return occupancy;
}

function looksLikeHeryervillam(pageUrl: string, html: string): boolean {
  const host = normalizeHost(new URL(pageUrl).hostname);
  if (host.includes("heryervillam")) return true;
  return (
    html.includes("/villa/takvim_ajax.php") && html.includes("fiyat-tablosu")
  );
}

export function scrapeHeryervillamFromHtml(
  pageUrl: string,
  html: string,
  warnings: string[]
): ScrapedVillaPage | null {
  if (!looksLikeHeryervillam(pageUrl, html)) return null;

  const periods = parseHeryervillamPeriods(html);
  const occupancyByDateKey = parseHeryervillamOccupancy(html);

  if (periods.length === 0) {
    if (occupancyByDateKey.size > 0) {
      warnings.push(
        "Heryervillam takvimi okundu ancak fiyat tablosu bulunamadı"
      );
    }
    return null;
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Heryervillam fiyatları alındı; müsaitlik takvimi HTML'de bulunamadı"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "heryervillam",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

/** Genel HTML: Türkçe tarih aralığı + data-price="..." (gecelik). */
export function parseGenericHtmlPeriods(html: string): MappedVillaPricePeriod[] {
  const deposit = extractDamageDeposit(html);
  const bocek = parseBoceksoftPeriodList(html, deposit);
  if (bocek.length > 0) return bocek;

  const periods: MappedVillaPricePeriod[] = [];
  const blockRe =
    /(?:<li|<div|<tr)[^>]*>[\s\S]{0,800}?data-price=["'](\d+)["'][\s\S]{0,800}?(?:<\/li>|<\/div>|<\/tr>)/gi;
  let match: RegExpExecArray | null;
  let sourceId = 1;

  while ((match = blockRe.exec(html)) !== null) {
    const block = match[0] ?? "";
    const price = Number(match[1]);
    if (!price) continue;
    const text = stripTags(block);
    const rangeMatch = text.match(
      /(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})\s*[-–—]\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})/u
    );
    if (!rangeMatch) continue;
    const range = parseTurkishDateRange(
      `${rangeMatch[1]} - ${rangeMatch[2]}`
    );
    if (!range) continue;
    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice: price,
        damageDeposit: deposit.amount,
        damageDepositCurrency: deposit.currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

function originFromUrl(pageUrl: string): string {
  const parsed = new URL(pageUrl);
  return `${parsed.protocol}//${parsed.host}`;
}

function looksLikeKvtPricing(pageUrl: string, html: string): boolean {
  const host = normalizeHost(new URL(pageUrl).hostname);
  if (host.includes("risusvillatatili")) return true;
  return html.includes("pricing-item") && html.includes("fake-calendar");
}

function extractKvtCalendarMeta(html: string): {
  villaId: string | null;
  doviz: string;
} {
  const fake =
    html.match(
      /id=["']fake-calendar["'][^>]*\bdata-id=["'](\d+)["']/i
    ) ??
    html.match(
      /\bdata-id=["'](\d+)["'][^>]*\bid=["']fake-calendar["']/i
    );
  const doviz =
    html.match(/fake-calendar[^>]*\bdata-doviz=["']([^"']+)["']/i)?.[1] ??
    "tl";
  return { villaId: fake?.[1] ?? null, doviz };
}

/** risusvillatatili.com / KVT — `.pricing-item` kartları (haftalık + gecelik). */
export function parseKvtPricingItems(
  html: string,
  damageDeposit?: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  const chunks = html.split(/<div[^>]*\bpricing-item\b[^>]*>/i);
  let sourceId = 1;

  for (let index = 1; index < chunks.length; index++) {
    const block = (chunks[index] ?? "").slice(0, 8000);
    const text = stripTags(block);
    const rangeMatch = text.match(
      /(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü.]+\s+\d{4})\s*[-–—]\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü.]+\s+\d{4})/u
    );
    if (!rangeMatch) continue;

    const range = parseTurkishDateRange(
      `${rangeMatch[1]} - ${rangeMatch[2]}`
    );
    if (!range) continue;

    const priceCols = [
      ...block.matchAll(/class=["']col-2[^"']*["'][^>]*>([\s\S]*?)(?=<div class=["']col-2|<\/div>\s*<\/div>\s*<\/div>)/gi),
    ];
    const priceHits = priceCols
      .flatMap((match) => {
        const col = match[1] ?? "";
        const hit = col.match(
          /data-doviz=["']([^"']+)["'][^>]*\bdata-price=["'](\d+)["']/i
        );
        if (!hit) return [];
        const price = Number(hit[2]);
        if (!Number.isFinite(price) || price <= 0) return [];
        return [{ currency: mapCurrencyCode(hit[1]), price }];
      });

    if (priceHits.length === 0) continue;

    const nightly =
      priceHits.length >= 2
        ? priceHits.reduce((lowest, item) =>
            item.price < lowest.price ? item : lowest
          )
        : priceHits[0]!;
    const weekly =
      priceHits.length >= 2
        ? priceHits.reduce((highest, item) =>
            item.price > highest.price ? item : highest
          )
        : null;

    const minStayMatch = text.match(/(?:Minimum|Min\.?)\s+(\d+)\s+Gece/i);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice: nightly.price,
        currency: nightly.currency,
        weeklyPrice: weekly && weekly.price > nightly.price ? weekly.price : null,
        minStayNights: minStayMatch ? Number(minStayMatch[1]) : null,
        damageDeposit: damageDeposit?.amount ?? null,
        damageDepositCurrency: damageDeposit?.currency ?? nightly.currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

async function scrapeKvtFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  if (!looksLikeKvtPricing(pageUrl, html)) return null;

  const deposit = extractDamageDeposit(html);
  const periods = parseKvtPricingItems(html, deposit);
  const meta = extractKvtCalendarMeta(html);
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();

  if (meta.villaId) {
    await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
    try {
      const body = await fetchText(`${originFromUrl(pageUrl)}/ajax/villatarih`, {
        method: "POST",
        body: `id=${encodeURIComponent(meta.villaId)}&doviz=${encodeURIComponent(meta.doviz || "tl")}`,
        referer: pageUrl,
      });
      if (body.includes("##")) {
        const occ = parseBoceksoftVillatarihResponse(body);
        for (const [key, value] of occ) occupancyByDateKey.set(key, value);
      } else {
        warnings.push("KVT takvim yanıtı beklenen formatta değil");
      }
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `KVT müsaitlik AJAX başarısız: ${error.message}`
          : "KVT müsaitlik AJAX başarısız"
      );
    }
  } else {
    warnings.push("KVT takvim villa id (fake-calendar) bulunamadı");
  }

  if (periods.length === 0) return null;

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "KVT fiyatları alındı; müsaitlik takvimi okunamadı veya boş"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "kvt",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

async function scrapeBoceksoft(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  const host = normalizeHost(new URL(pageUrl).hostname);
  const deposit = extractDamageDeposit(html);
  let periods = parseBoceksoftPeriodList(html, deposit);
  if (periods.length === 0) {
    periods = parseBoceksoftPriceRangeRows(html, deposit);
  }
  const meta = extractBoceksoftCalendarMeta(html);
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();

  const looksBocek =
    host.includes("dalvillalari") ||
    host.includes("kiralikvilladatatil") ||
    Boolean(meta.villaId) ||
    html.includes("/ajax/villatarih") ||
    html.includes("boceksoft") ||
    html.includes("price-range-hover");

  if (!looksBocek && periods.length === 0) return null;

  if (meta.villaId) {
    await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
    try {
      const body = await fetchText(`${originFromUrl(pageUrl)}/ajax/villatarih`, {
        method: "POST",
        body: `id=${encodeURIComponent(meta.villaId)}&doviz=${encodeURIComponent(meta.doviz || "tl")}`,
        referer: pageUrl,
      });
      const occ = parseBoceksoftVillatarihResponse(body);
      for (const [k, v] of occ) occupancyByDateKey.set(k, v);

      // HTML periyot yoksa günlük fiyatlardan üret
      if (periods.length === 0) {
        const parts = body.split("##");
        const dateParts = (parts[8] ?? "").split(",");
        const priceParts = (parts[9] ?? "").split(",");
        const dates: string[] = [];
        const prices: number[] = [];
        const n = Math.min(dateParts.length, priceParts.length);
        for (let i = 0; i < n; i++) {
          const key = normalizeLooseDateKey((dateParts[i] ?? "").trim());
          const price = Number((priceParts[i] ?? "").trim().replace(",", "."));
          if (!key || !Number.isFinite(price) || price <= 0) continue;
          dates.push(key);
          prices.push(price);
        }
        periods = collapseDailyPricesToPeriods(
          dates,
          prices,
          mapCurrencyCode(meta.doviz)
        );
        if (periods.length > 0) {
          warnings.push(
            "Dönem listesi HTML'de yoktu; takvim günlük fiyatlarından birleştirildi"
          );
        }
      }
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Müsaitlik AJAX başarısız: ${error.message}`
          : "Müsaitlik AJAX başarısız"
      );
    }
  } else {
    warnings.push("Takvim villa id (#calendar data-id) bulunamadı; sadece fiyat çekildi");
  }

  if (periods.length === 0) return null;

  return {
    sourceHost: host,
    strategy: "boceksoft",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

const VILLAVILLAM_API = "https://api.villavillam.com.tr";

function looksLikeVillavillam(pageUrl: string): boolean {
  try {
    return normalizeHost(new URL(pageUrl).hostname).includes("villavillam");
  } catch {
    return false;
  }
}

function currencyFromVillavillamSymbol(symbol: string | null | undefined): {
  apiCurrency: string;
  currency: VillaPeriodCurrency;
} {
  const raw = (symbol ?? "").trim();
  if (raw === "€" || /eur/i.test(raw)) return { apiCurrency: "EUR", currency: "EUR" };
  if (raw === "$" || /usd/i.test(raw)) return { apiCurrency: "USD", currency: "USD" };
  if (raw === "£" || /gbp/i.test(raw)) return { apiCurrency: "GBP", currency: "GBP" };
  return { apiCurrency: "TL", currency: "TL" };
}

function extractVillavillamEntity(html: string): {
  entityId: string;
  title: string | null;
  symbol: string | null;
  damageDeposit: number | null;
  result: Record<string, unknown>;
} | null {
  const data = parseNextDataJson(html);
  if (!data || typeof data !== "object") return null;
  const result = (data as { props?: { pageProps?: { data?: { result?: unknown } } } })
    .props?.pageProps?.data?.result;
  if (!result || typeof result !== "object") return null;
  const o = result as Record<string, unknown>;
  const entityId = String(o.id ?? "").trim();
  if (!entityId) return null;
  const hasarRaw = o.hasar;
  const damageDeposit =
    typeof hasarRaw === "number"
      ? hasarRaw
      : typeof hasarRaw === "string"
        ? Number(String(hasarRaw).replace(/[^\d.]/g, ""))
        : NaN;
  return {
    entityId,
    title:
      typeof o.baslik === "string"
        ? o.baslik
        : typeof o.title === "string"
          ? o.title
          : null,
    symbol: typeof o.Symbol === "string" ? o.Symbol : null,
    damageDeposit: Number.isFinite(damageDeposit) && damageDeposit > 0 ? damageDeposit : null,
    result: o,
  };
}

function parseVillavillamAvailabilityFromResult(
  result: Record<string, unknown>,
  symbol: string | null | undefined
) {
  const candidates: Record<string, unknown>[] = [result];
  for (const key of ["availability", "takvim", "calendar", "musaitlik"]) {
    const nested = result[key];
    if (nested && typeof nested === "object") {
      candidates.push(nested as Record<string, unknown>);
    }
  }

  for (const candidate of candidates) {
    const parsed = parseVillavillamAvailability({
      Symbol: symbol ?? undefined,
      data: candidate,
    });
    if (parsed.occupancyByDateKey.size > 0 || parsed.dailyDateKeys.length > 0) {
      return parsed;
    }
  }

  return null;
}

async function fetchVillavillamJson<T>(
  pathAndQuery: string,
  referer: string
): Promise<T> {
  const response = await fetch(`${VILLAVILLAM_API}${pathAndQuery}`, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json, text/plain, */*",
      Origin: "https://www.villavillam.com.tr",
      Referer: referer,
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Villavillam API ${response.status}: ${pathAndQuery}`);
  }
  return (await response.json()) as T;
}

function parseVillavillamPriceList(
  rows: unknown[],
  currency: VillaPeriodCurrency,
  damageDeposit: number | null
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  let sourceId = 1;
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const startRaw = String(o.tarih1 ?? "").trim();
    const endRaw = String(o.tarih2 ?? "").trim();
    const startDate = parseIsoLikeDate(startRaw);
    const endDate = parseIsoLikeDate(endRaw);
    if (!startDate || !endDate || compareDates(startDate, endDate) > 0) continue;

    const gece = Number(o.gece);
    const packagePrice = Number(
      typeof o.fiyat === "string" || typeof o.fiyat === "number" ? o.fiyat : NaN
    );
    const daily =
      typeof o.dailyPrice === "number"
        ? o.dailyPrice
        : Number(o.dailyPrice ?? NaN);
    let nightlyPrice =
      Number.isFinite(daily) && daily > 0
        ? daily
        : Number.isFinite(packagePrice) &&
            Number.isFinite(gece) &&
            gece > 0
          ? packagePrice / gece
          : NaN;
    if (!Number.isFinite(nightlyPrice) || nightlyPrice <= 0) continue;

    const oran = Number(o.oran);
    const discount1Rate =
      Number.isFinite(oran) && oran > 0 && oran < 100 ? Math.round(oran) : null;

    const cleaningFee = Number(o.temizlikFiyat);
    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate,
        endDate,
        nightlyPrice,
        currency,
        weeklyPrice:
          Number.isFinite(gece) && gece === 7 && Number.isFinite(packagePrice)
            ? packagePrice
            : undefined,
        minStayNights: Number.isFinite(gece) && gece > 0 ? gece : null,
        damageDeposit,
        damageDepositCurrency: currency,
        discount1Rate,
      })
    );
    const last = periods[periods.length - 1]!;
    if (Number.isFinite(cleaningFee) && cleaningFee > 0) {
      last.cleaningFee = Math.round(cleaningFee);
      last.cleaningFeeCurrency = currency;
    }
  }
  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

function parseVillavillamAvailability(payload: {
  Symbol?: string;
  data?: Record<string, unknown>;
}): {
  occupancyByDateKey: Map<string, VillaDayOccupancy>;
  dailyDateKeys: string[];
  dailyPrices: number[];
  currency: VillaPeriodCurrency;
} {
  const data = payload.data ?? {};
  const { currency } = currencyFromVillavillamSymbol(payload.Symbol);
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();

  const mark = (values: unknown, status: VillaDayOccupancy) => {
    if (!Array.isArray(values)) return;
    for (const raw of values) {
      const key = normalizeLooseDateKey(String(raw ?? ""));
      if (!key) continue;
      occupancyByDateKey.set(key, status);
    }
  };

  mark(data.doluGunler, "BOOKED");
  mark(data.doluGirisler, "BOOKED");
  mark(data.odemeGunler, "OPTION");

  const datesRaw = Array.isArray(data.fiyatlarTarihler)
    ? data.fiyatlarTarihler
    : [];
  const pricesRaw = Array.isArray(data.fiyatlar) ? data.fiyatlar : [];
  const dailyDateKeys: string[] = [];
  const dailyPrices: number[] = [];
  const n = Math.min(datesRaw.length, pricesRaw.length);
  for (let i = 0; i < n; i++) {
    const key = normalizeLooseDateKey(String(datesRaw[i] ?? ""));
    const price = Number(String(pricesRaw[i] ?? "").replace(/[^\d.]/g, ""));
    if (!key || !Number.isFinite(price) || price <= 0) continue;
    dailyDateKeys.push(key);
    dailyPrices.push(price);
  }

  return { occupancyByDateKey, dailyDateKeys, dailyPrices, currency };
}

export async function scrapeVillavillamFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  if (!looksLikeVillavillam(pageUrl)) return null;

  const entity = extractVillavillamEntity(html);
  if (!entity) {
    warnings.push("Villavillam __NEXT_DATA__ villa id bulunamadı");
    return null;
  }

  const { apiCurrency, currency: symbolCurrency } =
    currencyFromVillavillamSymbol(entity.symbol);

  await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
  let priceRows: unknown[] = [];
  try {
    const priceJson = await fetchVillavillamJson<{
      data?: unknown[];
      error?: string;
    }>(
      `/PriceList?id=${encodeURIComponent(entity.entityId)}&currency=${encodeURIComponent(apiCurrency)}&start2=`,
      pageUrl
    );
    priceRows = Array.isArray(priceJson.data) ? priceJson.data : [];
    if (priceRows.length === 0 && priceJson.error) {
      warnings.push(`Villavillam PriceList: ${priceJson.error}`);
    }
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `Villavillam PriceList başarısız: ${error.message}`
        : "Villavillam PriceList başarısız"
    );
  }

  await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
  let availability: ReturnType<typeof parseVillavillamAvailability> | null =
    null;
  const availabilityQueries = [
    `/Availability?EntityId=${encodeURIComponent(entity.entityId)}&start2=`,
    `/Availability?EntityId=${encodeURIComponent(entity.entityId)}&start2=&currency=${encodeURIComponent(apiCurrency)}`,
  ];
  for (const query of availabilityQueries) {
    if (availability && availability.occupancyByDateKey.size > 0) break;
    try {
      const availJson = await fetchVillavillamJson<{
        Symbol?: string;
        data?: Record<string, unknown>;
      }>(query, pageUrl);
      availability = parseVillavillamAvailability(availJson);
    } catch {
      // Sonraki parametreyle dene
    }
  }

  if (!availability || availability.occupancyByDateKey.size === 0) {
    availability =
      parseVillavillamAvailabilityFromResult(entity.result, entity.symbol) ??
      availability;
  }

  if (!availability || availability.occupancyByDateKey.size === 0) {
    warnings.push(
      "Villavillam Availability API boş döndü; sayfa verisinden müsaitlik okunamadı"
    );
  }

  const currency = availability?.currency ?? symbolCurrency;
  let periods = parseVillavillamPriceList(
    priceRows,
    currency,
    entity.damageDeposit
  );

  if (periods.length === 0 && availability) {
    periods = collapseDailyPricesToPeriods(
      availability.dailyDateKeys,
      availability.dailyPrices,
      currency
    ).map((p) => ({
      ...p,
      damageDeposit: entity.damageDeposit ?? p.damageDeposit,
      damageDepositCurrency: currency,
    }));
    if (periods.length > 0) {
      warnings.push(
        "Villavillam dönem listesi boştu; günlük fiyatlardan birleştirildi"
      );
    }
  }

  if (periods.length === 0) return null;

  const occupancyByDateKey =
    availability?.occupancyByDateKey ?? new Map<string, VillaDayOccupancy>();
  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Villavillam fiyatları alındı; müsaitlik takvimi bulunamadı (tüm günler boş kabul edildi)"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "villavillam",
    pageTitle: entity.title ?? extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

function looksLikeVillakalkan(pageUrl: string): boolean {
  try {
    return normalizeHost(new URL(pageUrl).hostname).includes("villakalkan");
  } catch {
    return false;
  }
}

function parseNuxtPayload(html: string): unknown | null {
  const m = html.match(/window\.__NUXT__\s*=([\s\S]*?)<\/script>/);
  if (!m?.[1]) return null;
  const expr = m[1].trim().replace(/;+\s*$/, "");
  try {
    return Function(`"use strict"; return ${expr}`)();
  } catch {
    return null;
  }
}

function parseMoneyWithCurrency(raw: string): {
  amount: number | null;
  currency: VillaPeriodCurrency;
} {
  const text = decodeHtmlEntities(String(raw ?? "")).trim();
  if (!text) return { amount: null, currency: "TL" };
  const currency = mapCurrencyCode(
    text.match(/(TL|EUR|USD|GBP|₺|€|\$|£)/i)?.[1] ?? "TL"
  );
  const digits = text.replace(/[^\d.,]/g, "").trim();
  if (!digits) return { amount: null, currency };
  const amount = positiveInt(Math.round(parseLocalizedMoney(digits)));
  return { amount, currency };
}

/**
 * Villakalkan Nuxt `calendar`: status 1=opsiyon, 2/4=kapalı.
 * dateStatus 2 (yalnızca çıkış günü) overnight BOOKED sayılmaz.
 */
export function parseVillakalkanOccupancy(
  calendar: unknown
): Map<string, VillaDayOccupancy> {
  const occupancy = new Map<string, VillaDayOccupancy>();
  if (!Array.isArray(calendar)) return occupancy;

  for (const raw of calendar) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const statuses = Array.isArray(o.status)
      ? o.status.map((s) => Number(s)).filter((n) => Number.isFinite(n))
      : [];
    if (statuses.includes(3)) continue;

    const dateStatuses = Array.isArray(o.dateStatus)
      ? o.dateStatus.map((s) => Number(s)).filter((n) => Number.isFinite(n))
      : [];
    const isCheckoutOnly =
      dateStatuses.includes(2) &&
      !dateStatuses.includes(0) &&
      !dateStatuses.includes(1);
    if (isCheckoutOnly) continue;

    const datesRaw = o.dates;
    const dateList = Array.isArray(datesRaw)
      ? datesRaw
      : typeof datesRaw === "string"
        ? [datesRaw]
        : [];

    const isBooked = statuses.includes(2) || statuses.includes(4);
    const isOption = statuses.includes(1);
    if (!isBooked && !isOption) continue;

    for (const d of dateList) {
      const key = normalizeLooseDateKey(String(d ?? ""));
      if (!key) continue;
      if (isBooked) {
        occupancy.set(key, "BOOKED");
      } else if (!occupancy.has(key) || occupancy.get(key) !== "BOOKED") {
        occupancy.set(key, "OPTION");
      }
    }
  }

  return occupancy;
}

export function parseVillakalkanPriceList(
  priceList: unknown,
  deposit: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  if (!Array.isArray(priceList) || priceList.length === 0) return [];

  const dateKeys: string[] = [];
  const prices: number[] = [];
  let currency: VillaPeriodCurrency = deposit.currency;

  const rows: Array<{ key: string; price: number; currency: VillaPeriodCurrency }> =
    [];
  for (const raw of priceList) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const key = normalizeLooseDateKey(String(o.dates ?? ""));
    if (!key) continue;
    const parsed = parseMoneyWithCurrency(String(o.price ?? ""));
    if (!parsed.amount || parsed.amount <= 0) continue;
    rows.push({ key, price: parsed.amount, currency: parsed.currency });
  }

  rows.sort((a, b) => a.key.localeCompare(b.key));
  for (const row of rows) {
    dateKeys.push(row.key);
    prices.push(row.price);
    currency = row.currency;
  }

  return collapseDailyPricesToPeriods(dateKeys, prices, currency).map((p) => ({
    ...p,
    damageDeposit: deposit.amount ?? p.damageDeposit,
    damageDepositCurrency: deposit.currency,
  }));
}

export function scrapeVillakalkanFromHtml(
  pageUrl: string,
  html: string,
  warnings: string[]
): ScrapedVillaPage | null {
  if (!looksLikeVillakalkan(pageUrl)) return null;

  const nuxt = parseNuxtPayload(html);
  if (!nuxt || typeof nuxt !== "object") {
    warnings.push("Villakalkan window.__NUXT__ okunamadı");
    return null;
  }

  const data0 = (nuxt as { data?: unknown[] }).data?.[0];
  if (!data0 || typeof data0 !== "object") {
    warnings.push("Villakalkan __NUXT__ data[0] yok");
    return null;
  }

  const page = data0 as Record<string, unknown>;
  const componentData =
    page.componentData && typeof page.componentData === "object"
      ? (page.componentData as Record<string, unknown>)
      : null;
  const deposit = parseMoneyWithCurrency(String(page.deposit ?? ""));
  const periods = parseVillakalkanPriceList(page.price_list_1, deposit);
  const occupancyByDateKey = parseVillakalkanOccupancy(page.calendar);

  if (periods.length === 0) {
    if (occupancyByDateKey.size > 0) {
      warnings.push(
        "Villakalkan takvim okundu ancak price_list_1 bulunamadı"
      );
    }
    return null;
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Villakalkan fiyatları alındı; müsaitlik takvimi (calendar) boş"
    );
  }

  const titleFromCd =
    typeof componentData?.name === "string" ? componentData.name.trim() : null;

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "villakalkan",
    pageTitle: titleFromCd || extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

function looksLikeYazlikvillaci(pageUrl: string, html: string): boolean {
  const host = normalizeHost(new URL(pageUrl).hostname);
  if (host.includes("yazlikvillaci")) return true;
  return (
    html.includes("pricingTable2") &&
    (html.includes("property/re_calculate") ||
      html.includes("'/calendar'") ||
      html.includes('"/calendar"') ||
      html.includes("load(window.location.href + '/calendar')"))
  );
}

function buildYazlikvillaciCalendarUrl(pageUrl: string): string {
  const parsed = new URL(pageUrl.trim());
  const path = parsed.pathname.replace(/\/$/, "");
  return `${parsed.origin}${path}/calendar`;
}

function unixTimestampToDateKey(ts: number): string | null {
  if (!Number.isFinite(ts) || ts <= 0) return null;
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKey(startOfDay(date));
}

function parseYazlikvillaciMoney(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return NaN;
  return Number(digits);
}

function parseYazlikvillaciCalendarMonth(
  raw: string
): { year: number; month: number } | null {
  const match = raw
    .trim()
    .match(/^([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})$/u);
  if (!match) return null;
  const month = TURKISH_MONTHS[match[1]!.toLocaleLowerCase("tr-TR")];
  const year = Number(match[2]);
  if (!month || !Number.isFinite(year)) return null;
  return { year, month };
}

/** yazlikvillaci.com.tr — #villaPrices pricingTable2 kartları */
export function parseYazlikvillaciPeriods(
  html: string
): MappedVillaPricePeriod[] {
  const deposit = extractDamageDeposit(html);
  const periods: MappedVillaPricePeriod[] = [];
  const seen = new Set<string>();
  let sourceId = 1;

  const chunks = html.split('class="pricingTable2');
  for (let index = 1; index < chunks.length; index += 1) {
    const block = `class="pricingTable2${chunks[index]}`;
    const text = stripTags(block);

    const rangeMatch = text.match(
      /(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})\s*[-–—]\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})/u
    );
    if (!rangeMatch) continue;

    const range = parseTurkishDateRange(
      `${rangeMatch[1]} - ${rangeMatch[2]}`
    );
    if (!range) continue;

    const nightlyMatch = block.match(
      /price-value1[\s\S]*?₺\s*([\d.,]+)[\s\S]*?\/Gecelik/i
    );
    if (!nightlyMatch) continue;
    const nightlyPrice = parseYazlikvillaciMoney(nightlyMatch[1]!);
    if (!Number.isFinite(nightlyPrice) || nightlyPrice <= 0) continue;

    const weeklyMatch = block.match(
      /price-value1[\s\S]*?₺\s*([\d.,]+)[\s\S]*?\/Haftalık/i
    );
    const weeklyPrice = weeklyMatch
      ? parseYazlikvillaciMoney(weeklyMatch[1]!)
      : null;

    const minStayMatch = text.match(
      /Minimum\s*Kiralama:\s*(\d+)\s*Gece/i
    );
    const minStayNights = minStayMatch ? Number(minStayMatch[1]) : null;

    const key = `${toDateKey(range.start)}_${toDateKey(range.end)}_${nightlyPrice}`;
    if (seen.has(key)) continue;
    seen.add(key);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice,
        weeklyPrice:
          weeklyPrice != null && Number.isFinite(weeklyPrice) && weeklyPrice > 0
            ? weeklyPrice
            : null,
        currency: "TL",
        minStayNights,
        damageDeposit: deposit.amount,
        damageDepositCurrency: deposit.currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

/** yazlikvillaci /calendar fragment — Dolu günler + günlük fiyatlar */
export function parseYazlikvillaciOccupancy(
  calendarHtml: string
): Map<string, VillaDayOccupancy> {
  const occupancy = new Map<string, VillaDayOccupancy>();
  const boxes = calendarHtml.split(/<div class="calendarBox"/i);

  for (let boxIndex = 1; boxIndex < boxes.length; boxIndex += 1) {
    const block = boxes[boxIndex] ?? "";
    const headerMatch = block.match(/<h4>([^<]+)<\/h4>/i);
    if (!headerMatch) continue;
    const monthCtx = parseYazlikvillaciCalendarMonth(headerMatch[1]!);
    if (!monthCtx) continue;

    const cellRe = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
    let match: RegExpExecArray | null;

    while ((match = cellRe.exec(block)) !== null) {
      const attrs = match[1] ?? "";
      const inner = match[2] ?? "";

      if (
        /\bempty\b/.test(attrs) ||
        /\bdayname\b/.test(attrs) ||
        /\blastday\b/.test(attrs) ||
        /\bclosedays\b/.test(attrs)
      ) {
        continue;
      }

      const idMatch = attrs.match(/\bid=["'](\d+)["']/i);
      let dateKey: string | null = null;
      if (idMatch) {
        dateKey = unixTimestampToDateKey(Number(idMatch[1]));
      } else {
        const dayMatch =
          inner.match(/>(\d{1,2})<br/i) ?? inner.match(/>(\d{1,2})</);
        const day = dayMatch ? Number(dayMatch[1]) : NaN;
        if (Number.isFinite(day) && day >= 1 && day <= 31) {
          dateKey = `${monthCtx.year}-${String(monthCtx.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
      }
      if (!dateKey) continue;

      const title = (
        inner.match(/title=["']([^"']+)["']/i)?.[1] ?? ""
      ).toLocaleLowerCase("tr-TR");

      const isTurnoverDay =
        /\bgiriscikis\b/.test(attrs) ||
        title.includes("giriş çıkış") ||
        title.includes("giris cikis");

      if (isTurnoverDay) {
        // Aynı gün çıkış+giriş: EMPTY kalır; görsel/engel iki dolu blok arası mantığıyla çözülür.
        continue;
      }

      const isBooked =
        (/\bbooked\b/.test(attrs) && !/\bbooked_half/.test(attrs)) ||
        title.includes("dolu");

      if (isBooked) {
        occupancy.set(dateKey, "BOOKED");
      }
    }
  }

  return occupancy;
}

async function scrapeYazlikvillaciFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  if (!looksLikeYazlikvillaci(pageUrl, html)) return null;

  const periods = parseYazlikvillaciPeriods(html);
  let occupancyByDateKey = new Map<string, VillaDayOccupancy>();

  try {
    await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
    const calendarHtml = await fetchText(buildYazlikvillaciCalendarUrl(pageUrl), {
      referer: pageUrl,
    });
    occupancyByDateKey = parseYazlikvillaciOccupancy(calendarHtml);
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `Yazlık Villacı takvim alınamadı: ${error.message}`
        : "Yazlık Villacı takvim alınamadı"
    );
  }

  if (periods.length === 0) {
    if (occupancyByDateKey.size > 0) {
      warnings.push(
        "Yazlık Villacı takvimi okundu ancak fiyat kartları bulunamadı"
      );
    }
    return null;
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Yazlık Villacı fiyatları alındı; müsaitlik takvimi boş veya okunamadı"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "yazlikvillaci",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

/**
 * Public villa sayfasını çeker ve periyot + occupancy döner.
 * dry-run / sync aynı path.
 */
export async function scrapeExternalVillaPage(
  pageUrl: string
): Promise<ScrapedVillaPage> {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl.trim());
  } catch {
    throw new Error("Geçersiz villa sayfası URL'si");
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("URL http veya https olmalı");
  }

  const html = await fetchText(parsed.toString());
  await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);

  const warnings: string[] = [];

  const heryer = scrapeHeryervillamFromHtml(parsed.toString(), html, warnings);
  if (heryer) return heryer;

  const yazlikvillaci = await scrapeYazlikvillaciFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (yazlikvillaci) return yazlikvillaci;

  const villavillam = await scrapeVillavillamFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (villavillam) return villavillam;

  const villakalkan = scrapeVillakalkanFromHtml(
    parsed.toString(),
    html,
    warnings
  );
  if (villakalkan) return villakalkan;

  const kvt = await scrapeKvtFromPage(parsed.toString(), html, warnings);
  if (kvt) return kvt;

  const bocek = await scrapeBoceksoft(parsed.toString(), html, warnings);
  if (bocek) return bocek;

  const next = parseNextDataPeriodsAndOccupancy(html);
  if (next && next.periods.length > 0) {
    return {
      sourceHost: normalizeHost(parsed.hostname),
      strategy: "next_data",
      pageTitle: extractPageTitle(html),
      periods: next.periods,
      occupancyByDateKey: next.occupancyByDateKey,
      warnings,
    };
  }

  const generic = parseGenericHtmlPeriods(html);
  if (generic.length > 0) {
    if (!next || next.occupancyByDateKey.size === 0) {
      warnings.push(
        "Müsaitlik takvimi bu sitede otomatik okunamadı; yalnızca fiyat periyotları aktarıldı"
      );
    }
    return {
      sourceHost: normalizeHost(parsed.hostname),
      strategy: "html_periods",
      pageTitle: extractPageTitle(html),
      periods: generic,
      occupancyByDateKey: next?.occupancyByDateKey ?? new Map(),
      warnings,
    };
  }

  throw new Error(
    "Bu villa sayfasından fiyat/takvim okunamadı. Desteklenen örnekler: heryervillam.com, villavillam.com.tr, villakalkan.com.tr, yazlikvillaci.com.tr, risusvillatatili.com, kiralikvilladatatil.com / dalvillalari.com (Boceksoft), __NEXT_DATA__ periyot içeren Next.js siteleri, veya HTML dönem fiyat tablosu."
  );
}
