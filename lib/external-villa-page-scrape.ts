/**
 * Public villa sayfalarından (HTML / site AJAX) fiyat periyodu + müsaitlik çeker.
 * API verilmez; ajans olarak public sayfayı okur.
 *
 * Destek:
 * - heryervillam.com (HTML fiyat tablosu + takvim)
 * - villavillam.com.tr / villacim.com.tr (NEXT_DATA id + api PriceList/Availability)
 * - tatilpremium.com (RSC routingData id + api.tatilpremium.com PriceList/Availability)
 * - akdenizvillam.com (Next.js RSC gömülü prices_data / availabilitys_data)
 * - villavakti.com (sezon fiyat tablosu)
 * - villaciniz.com.tr / villapaketi.com / villayolu.com (routingData id + api PriceList/Availability)
 * - mustakilvillam.com / myvillacity.com / villakilavuzu.com (routingData id + api PriceList/Availability)
 * - luxuryvillam.com (window.VILLA_CALENDAR gömülü günlük fiyat + müsaitlik)
 * - hepsivilla.com (price_block haftalık/gecelik + AJAX cal.do takvim)
 * - villakalkan.com.tr (Nuxt __NUXT__ price_list_1 + calendar)
 * - tatilvillamda.com (gömülü fiyat_yazilan_tarihler + dolutarihler)
 * - kaskavilla.com (Nuxt __NUXT__ priceTable + frontapi/periyotlar takvim)
 * - villaevreni.com (aynı panel altyapısı)
 * - tatilvillasi.com.tr (prices_function + availabilitys_function API)
 * - yazlikvillaci.com.tr (pricingTable2 + /calendar müsaitlik)
 * - dalvillalari.com / Boceksoft (HTML dönem + POST /ajax/villatarih)
 * - yazlikcim.com.tr (Boceksoft takvim; günlük fiyat yoksa schema/sezon fallback)
 * - risusvillatatili.com / KVT (pricing-item + fake-calendar villatarih)
 * - tatilkentim.com (pricing-item gecelik/haftalık + /villa/{id}/calendar)
 * - villasayfam.com (api.villasayfam.com pricePeriods + availability)
 * - villaoteltatili.com (Bravo/VillaSistem liketablerow + loadDates takvim)
 * - Benzer Next.js villa siteleri (__NEXT_DATA__ period/booking anahtarları)
 * - Genel HTML: data-price + tarih aralığı
 */

import type { VillaDayOccupancy, VillaPeriodCurrency } from "@prisma/client";
import {
  calculateDiscountAmounts,
  deriveNightlyFromWeekly,
  deriveWeeklyFromNightly,
  deriveWithoutCommissionFromCommissioned,
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
    | "yazlikcim"
    | "next_data"
    | "html_periods"
    | "heryervillam"
    | "villavillam"
    | "villacim"
    | "tatilpremium"
    | "villapaketi"
    | "villaciniz"
    | "villayolu"
    | "mustakilvillam"
    | "myvillacity"
    | "villakilavuzu"
    | "luxuryvillam"
    | "akdenizvillam"
    | "villavakti"
    | "product_detail_rsc"
    | "hepsivilla"
    | "villakalkan"
    | "yazlikvillaci"
    | "kvt"
    | "tatilkentim"
    | "villasayfam"
    | "villaoteltatili"
    | "tatilvillamda"
    | "kaskavilla"
    | "villaevreni"
    | "tatilvillasi";
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
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
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
  const dmyShort = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2})$/);
  if (dmyShort) {
    const year = 2000 + Number(dmyShort[3]);
    return `${year}-${dmyShort[2]!.padStart(2, "0")}-${dmyShort[1]!.padStart(2, "0")}`;
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
  prepaymentRate?: number | null;
  commissionRate?: number | null;
  cleaningDayCount?: number | null;
  cleaningFee?: number | null;
  cleaningFeeCurrency?: VillaPeriodCurrency;
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
  const cleaningCurrency = input.cleaningFeeCurrency ?? currency;
  const commissionRate = positiveInt(input.commissionRate);
  const nightlyPriceWithoutCommission =
    commissionRate != null
      ? deriveWithoutCommissionFromCommissioned(nightlyPrice, commissionRate)
      : null;

  return {
    sourceId: input.sourceId,
    startDate: startOfDay(input.startDate),
    endDate: startOfDay(input.endDate),
    availability: "available",
    nightlyPrice,
    nightlyPriceCurrency: currency,
    weeklyPrice:
      positiveInt(input.weeklyPrice) ?? deriveWeeklyFromNightly(nightlyPrice),
    prepaymentRate: positiveInt(input.prepaymentRate),
    commissionRate,
    nightlyPriceWithoutCommission,
    discountedNightlyPrice: preview.discountedNightlyPrice,
    minStayNights: positiveInt(input.minStayNights),
    cleaningDayCount: positiveInt(input.cleaningDayCount),
    cleaningFee: positiveInt(input.cleaningFee),
    cleaningFeeCurrency: cleaningCurrency,
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

  if (response.status === 429) {
    for (const waitMs of [2500, 5000, 8000, 15000, 30000, 60000]) {
      await sleep(waitMs);
      const retry = await fetch(url, {
        method: options?.method ?? "GET",
        headers,
        body: options?.body,
        cache: "no-store",
        redirect: "follow",
      });
      if (retry.status !== 429) {
        if (!retry.ok) {
          throw new Error(`Sayfa alınamadı (${retry.status}): ${url}`);
        }
        return retry.text();
      }
    }
    throw new Error(`Sayfa alınamadı (429): ${url}`);
  }

  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status}): ${url}`);
  }

  return response.text();
}

async function fetchJson(
  url: string,
  options?: { referer?: string }
): Promise<unknown> {
  const headers: Record<string, string> = {
    ...(FETCH_HEADERS as Record<string, string>),
    Accept: "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
  };
  if (options?.referer) headers.Referer = options.referer;

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`JSON alınamadı (${response.status}): ${url}`);
  }

  return response.json() as Promise<unknown>;
}

function extractPageTitle(html: string): string | null {
  const og = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  if (og?.[1]) return decodeHtmlEntities(og[1]).trim();
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return title?.[1] ? decodeHtmlEntities(title[1]).trim() : null;
}

export type ScrapedVillaPeriodDefaults = {
  prepaymentRate: number | null;
  commissionRate: number | null;
  cleaningDayCount: number | null;
  cleaningFee: number | null;
  cleaningFeeCurrency: VillaPeriodCurrency;
  damageDeposit: number | null;
  damageDepositCurrency: VillaPeriodCurrency;
};

export type ScrapedVillaPeriodMeta = Partial<ScrapedVillaPeriodDefaults>;

function parsePercentRate(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const match = raw.match(/(\d{1,3})/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0 || value > 100) return null;
  return Math.round(value);
}

function parseTurkishMoneyAmount(raw: string): number | null {
  const s = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    return Number(s.replace(/\./g, ""));
  }
  const parsed = parseLocalizedMoney(s);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function parseCleaningRuleText(raw: string | null | undefined): {
  cleaningDayCount: number | null;
  cleaningFee: number | null;
  cleaningFeeCurrency: VillaPeriodCurrency;
} {
  const text = decodeHtmlEntities(raw ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return {
      cleaningDayCount: null,
      cleaningFee: null,
      cleaningFeeCurrency: "TL",
    };
  }

  const dayMatch = text.match(/(\d+)\s*gece\s*alt/i);
  const feeMatch = text.match(
    /(\d[\d.,\s]*)\s*(?:₺|TL|EUR|USD|GBP|€|\$|£)[^.]{0,40}temizlik/i
  );
  const currency = mapCurrencyCode(
    feeMatch?.[0]?.match(/(TL|EUR|USD|GBP|₺|€|\$|£)/i)?.[1] ?? "TL"
  );
  const cleaningFee = feeMatch?.[1]
    ? positiveInt(parseTurkishMoneyAmount(feeMatch[1]))
    : null;

  return {
    cleaningDayCount: dayMatch ? positiveInt(Number(dayMatch[1])) : null,
    cleaningFee,
    cleaningFeeCurrency: currency,
  };
}

function extractDamageDeposit(html: string): {
  amount: number | null;
  currency: VillaPeriodCurrency;
} {
  const structured = html.match(
    /hasar\s*depozito(?:su)?[\s\S]{0,180}?data-price=["'](\d+)["'][^>]*data-doviz=["']([^"']+)["']/i
  );
  if (structured?.[1]) {
    return {
      amount: positiveInt(Number(structured[1])),
      currency: mapCurrencyCode(structured[2]),
    };
  }

  const structuredAlt = html.match(
    /hasar\s*depozito(?:su)?[\s\S]{0,180}?data-doviz=["']([^"']+)["'][^>]*data-price=["'](\d+)["']/i
  );
  if (structuredAlt?.[2]) {
    return {
      amount: positiveInt(Number(structuredAlt[2])),
      currency: mapCurrencyCode(structuredAlt[1]),
    };
  }

  const text = stripTags(html);
  const m = text.match(
    /hasar\s*depozito(?:su)?[^0-9]{0,40}(\d[\d.\s]*)\s*(TL|EUR|USD|GBP|€|\$|£)?/i
  );
  if (!m) return { amount: null, currency: "TL" };
  const amount = positiveInt(Number((m[1] ?? "").replace(/[.\s]/g, "")));
  return { amount, currency: mapCurrencyCode(m[2]) };
}

function extractPrepaymentRate(html: string): number | null {
  const text = stripTags(html);

  // Villavakti vb.: "Rezervasyon için % 20 ön ödeme" — en güvenilir kaynak
  for (const match of text.matchAll(/%\s*(\d{1,3})\s*ön\s*ödeme/gi)) {
    const value = parsePercentRate(match[1] ?? null);
    if (value != null) return value;
  }

  const patterns = [
    /kiralama\s+kaporas[ıi][^%]{0,40}%\s*(\d{1,3})/gi,
    /ön\s*ödeme(?:\s*oran[ıi])?[^%]{0,40}%\s*(\d{1,3})/gi,
    /on\s*odeme(?:\s*orani)?[^%]{0,40}%\s*(\d{1,3})/gi,
    /kapora[^%]{0,40}%\s*(\d{1,3})/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const snippet = match[0] ?? "";
      // "ön ödemelerini ... Kalan % 80" girişte ödeme oranıdır, kapora değil
      if (/kalan/i.test(snippet)) continue;
      const value = parsePercentRate(match[1] ?? null);
      if (value != null) return value;
    }
  }
  return null;
}

function extractCommissionRate(html: string): number | null {
  const text = stripTags(html);
  const patterns = [
    /komisyon\s*oran[ıi]?[^%]{0,40}%\s*(\d{1,3})/i,
    /komisyon[^%]{0,30}%\s*(\d{1,3})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = parsePercentRate(match?.[1] ?? null);
    if (value != null) return value;
  }
  return null;
}

function extractCleaningDefaults(html: string): {
  cleaningDayCount: number | null;
  cleaningFee: number | null;
  cleaningFeeCurrency: VillaPeriodCurrency;
} {
  const titleMatches = [
    ...html.matchAll(/\btitle=["']([^"']*temizlik[^"']*)["']/gi),
  ];
  for (const match of titleMatches) {
    const parsed = parseCleaningRuleText(match[1]);
    if (parsed.cleaningFee != null || parsed.cleaningDayCount != null) {
      return parsed;
    }
  }

  const text = stripTags(html);
  const inline = text.match(
    /(\d+)\s*gece\s*alt[ıi]ndaki[^.]{0,80}?(\d[\d.,\s]*)\s*(?:₺|TL)[^.]{0,20}temizlik/i
  );
  if (inline) {
    return {
      cleaningDayCount: positiveInt(Number(inline[1])),
      cleaningFee: positiveInt(parseTurkishMoneyAmount(inline[2] ?? "")),
      cleaningFeeCurrency: "TL",
    };
  }

  return {
    cleaningDayCount: null,
    cleaningFee: null,
    cleaningFeeCurrency: "TL",
  };
}

export function extractScrapedPeriodDefaults(html: string): ScrapedVillaPeriodDefaults {
  const deposit = extractDamageDeposit(html);
  const cleaning = extractCleaningDefaults(html);
  return {
    prepaymentRate: extractPrepaymentRate(html),
    commissionRate: extractCommissionRate(html),
    cleaningDayCount: cleaning.cleaningDayCount,
    cleaningFee: cleaning.cleaningFee,
    cleaningFeeCurrency: cleaning.cleaningFeeCurrency,
    damageDeposit: deposit.amount,
    damageDepositCurrency: deposit.currency,
  };
}

function recomputeWithoutCommission(period: MappedVillaPricePeriod) {
  if (period.commissionRate == null) {
    period.nightlyPriceWithoutCommission = null;
    return;
  }
  period.nightlyPriceWithoutCommission = deriveWithoutCommissionFromCommissioned(
    period.nightlyPrice,
    period.commissionRate
  );
}

function applyMetaToPeriod(
  period: MappedVillaPricePeriod,
  meta: ScrapedVillaPeriodMeta,
  defaults: ScrapedVillaPeriodDefaults
) {
  if (period.prepaymentRate == null) {
    period.prepaymentRate =
      meta.prepaymentRate ?? defaults.prepaymentRate ?? null;
  }
  if (period.commissionRate == null) {
    period.commissionRate =
      meta.commissionRate ?? defaults.commissionRate ?? null;
  }
  if (period.cleaningDayCount == null) {
    period.cleaningDayCount =
      meta.cleaningDayCount ?? defaults.cleaningDayCount ?? null;
  }
  if (period.cleaningFee == null) {
    period.cleaningFee = meta.cleaningFee ?? defaults.cleaningFee ?? null;
    if (period.cleaningFee != null) {
      period.cleaningFeeCurrency =
        meta.cleaningFeeCurrency ?? defaults.cleaningFeeCurrency;
    }
  }
  if (period.damageDeposit == null) {
    period.damageDeposit =
      meta.damageDeposit ?? defaults.damageDeposit ?? null;
    if (period.damageDeposit != null) {
      period.damageDepositCurrency =
        meta.damageDepositCurrency ?? defaults.damageDepositCurrency;
    }
  }
  recomputeWithoutCommission(period);
}

export function finalizeScrapedPeriods(
  periods: MappedVillaPricePeriod[],
  html: string
): MappedVillaPricePeriod[] {
  const defaults = extractScrapedPeriodDefaults(html);
  return periods.map((period) => {
    const next = { ...period };
    applyMetaToPeriod(next, {}, defaults);
    return next;
  });
}

function finalizeScrapedPage(page: ScrapedVillaPage, html: string): ScrapedVillaPage {
  return {
    ...page,
    periods: finalizeScrapedPeriods(page.periods, html),
  };
}

function modeValue<T>(values: Array<T | null | undefined>): T | null {
  const counts = new Map<T, number>();
  for (const value of values) {
    if (value == null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export function applyPeriodMetaFallback(
  periods: MappedVillaPricePeriod[],
  fallback: ScrapedVillaPeriodMeta
) {
  const defaults: ScrapedVillaPeriodDefaults = {
    prepaymentRate: fallback.prepaymentRate ?? null,
    commissionRate: fallback.commissionRate ?? null,
    cleaningDayCount: fallback.cleaningDayCount ?? null,
    cleaningFee: fallback.cleaningFee ?? null,
    cleaningFeeCurrency: fallback.cleaningFeeCurrency ?? "TL",
    damageDeposit: fallback.damageDeposit ?? null,
    damageDepositCurrency: fallback.damageDepositCurrency ?? "TL",
  };
  for (const period of periods) {
    applyMetaToPeriod(period, {}, defaults);
  }
}

export function buildPeriodMetaFallbackFromPeriods(
  periods: Array<{
    prepaymentRate: number | null;
    commissionRate: number | null;
    cleaningDayCount: number | null;
    cleaningFee: number | null;
    cleaningFeeCurrency: VillaPeriodCurrency;
    damageDeposit: number | null;
    damageDepositCurrency: VillaPeriodCurrency;
  }>
): ScrapedVillaPeriodMeta {
  if (periods.length === 0) return {};
  return {
    prepaymentRate: modeValue(periods.map((period) => period.prepaymentRate)),
    commissionRate: modeValue(periods.map((period) => period.commissionRate)),
    cleaningDayCount: modeValue(periods.map((period) => period.cleaningDayCount)),
    cleaningFee: modeValue(periods.map((period) => period.cleaningFee)),
    cleaningFeeCurrency:
      modeValue(periods.map((period) => period.cleaningFeeCurrency)) ?? "TL",
    damageDeposit: modeValue(periods.map((period) => period.damageDeposit)),
    damageDepositCurrency:
      modeValue(periods.map((period) => period.damageDepositCurrency)) ?? "TL",
  };
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
  const cal =
    html.match(
      /<div[^>]+id=["']calendar["'][^>]*data-id=["']([^"']+)["'][^>]*>/i
    ) ??
    html.match(
      /id=["']fake-calendar["'][^>]*\bdata-id=["'](\d+)["']/i
    ) ??
    html.match(
      /\bdata-id=["'](\d+)["'][^>]*\bid=["']fake-calendar["']/i
    );
  const doviz =
    html.match(/id=["']calendar["'][^>]*data-doviz=["']([^"']+)["']/i)?.[1] ??
    html.match(/fake-calendar[^>]*\bdata-doviz=["']([^"']+)["']/i)?.[1] ??
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
    const titleMatch = block.match(/\btitle=["']([^"']+)["']/i);
    const cleaningMeta = parseCleaningRuleText(titleMatch?.[1]);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice: nightly.price,
        currency: nightly.currency,
        weeklyPrice: weekly && weekly.price > nightly.price ? weekly.price : null,
        minStayNights: minStayMatch ? Number(minStayMatch[1]) : null,
        cleaningDayCount: cleaningMeta.cleaningDayCount,
        cleaningFee: cleaningMeta.cleaningFee,
        cleaningFeeCurrency: cleaningMeta.cleaningFeeCurrency,
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

function looksLikeTatilkentim(pageUrl: string, html: string): boolean {
  try {
    const host = normalizeHost(new URL(pageUrl).hostname);
    if (!host.includes("tatilkentim")) return false;
    return html.includes("pricing-item") && html.includes("daily-price");
  } catch {
    return false;
  }
}

function extractTatilkentimTryPricingHtml(html: string): string {
  const start = html.search(/\bid=["']TRYTabPane["']/i);
  if (start < 0) return html;
  const end = html.search(/\bid=["']USDTabPane["']/i);
  if (end > start) return html.slice(start, end);
  return html.slice(start);
}

function parseTatilkentimMoneyLabel(raw: string): {
  amount: number | null;
  currency: VillaPeriodCurrency;
} {
  const text = stripTags(raw).trim();
  const currency = mapCurrencyCode(
    text.match(/(TL|EUR|USD|GBP|₺|€|\$|£)/i)?.[1] ?? "TL"
  );
  const digits = text.replace(/[^\d.,]/g, "").trim();
  if (!digits) return { amount: null, currency };

  let amount: number;
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(digits)) {
    amount = Number(digits.replace(/,/g, ""));
  } else {
    amount = Math.round(parseLocalizedMoney(digits));
  }

  return { amount: positiveInt(amount), currency };
}

/** tatilkentim.com — `.pricing-item` + `.daily-price` / `.weekly-price` (TRY sekmesi). */
export function parseTatilkentimPricingItems(
  html: string,
  damageDeposit?: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  const scope = extractTatilkentimTryPricingHtml(html);
  const periods: MappedVillaPricePeriod[] = [];
  const chunks = scope.split(/<div[^>]*\bpricing-item\b[^>]*>/i);
  let sourceId = 1;

  for (let index = 1; index < chunks.length; index++) {
    const block = (chunks[index] ?? "").slice(0, 4000);
    const text = stripTags(block);
    const rangeMatch = text.match(
      /(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü.]+\s+\d{4})\s*[-–—]\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü.]+\s+\d{4})/u
    );
    if (!rangeMatch) continue;

    const range = parseTurkishDateRange(
      `${rangeMatch[1]} - ${rangeMatch[2]}`
    );
    if (!range) continue;

    const dailyMatch = block.match(/class=["']daily-price["'][^>]*>([^<]+)</i);
    if (!dailyMatch) continue;

    const nightlyParsed = parseTatilkentimMoneyLabel(dailyMatch[1]!);
    const nightlyAmount = nightlyParsed.amount;
    if (!nightlyAmount) continue;

    const currency = nightlyParsed.currency;
    const weeklyMatch = block.match(/class=["']weekly-price["'][^>]*>([^<]+)</i);
    const weeklyParsed = weeklyMatch
      ? parseTatilkentimMoneyLabel(weeklyMatch[1]!)
      : { amount: null, currency };
    const weeklyAmount = weeklyParsed.amount;
    const minStayMatch = text.match(/(?:Minimum|Min\.?)[^0-9]*(\d+)\s+Gece/i);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice: nightlyAmount,
        currency,
        weeklyPrice:
          weeklyAmount && weeklyAmount > nightlyAmount ? weeklyAmount : null,
        minStayNights: minStayMatch ? Number(minStayMatch[1]) : null,
        damageDeposit: damageDeposit?.amount ?? null,
        damageDepositCurrency: damageDeposit?.currency ?? currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

function parseTurkishMonthYearLabel(
  raw: string
): { year: number; month: number } | null {
  const text = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
  const match = text.match(/^([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})$/u);
  if (!match) return null;

  const monthName = match[1]!.toLocaleLowerCase("tr-TR");
  const month = TURKISH_MONTHS[monthName];
  const year = Number(match[2]);
  if (!month || !Number.isFinite(year)) return null;
  return { year, month };
}

/** Tatilkentim `/villa/{id}/calendar` HTML — `day-rented` = dolu. */
export function parseTatilkentimCalendarOccupancy(
  html: string
): Map<string, VillaDayOccupancy> {
  const occupancy = new Map<string, VillaDayOccupancy>();
  const blocks = html.split(/<div class="calendar-month">/i).slice(1);

  for (const block of blocks) {
    const labelEnd = block.indexOf("<");
    const monthYear = parseTurkishMonthYearLabel(
      labelEnd >= 0 ? block.slice(0, labelEnd) : block
    );
    if (!monthYear) continue;

    const daysMatch = block.match(
      /<div class="calendar-days">([\s\S]*?)<\/div>\s*<\/div>/i
    );
    if (!daysMatch?.[1]) continue;

    const dayRe = /<div([^>]*)>\s*(?:<span>(\d+)<\/span>\s*)?<\/div>/gi;
    let match: RegExpExecArray | null;
    while ((match = dayRe.exec(daysMatch[1])) !== null) {
      const attrs = match[1] ?? "";
      const dayText = match[2];
      if (!dayText) continue;

      const day = Number(dayText);
      if (!Number.isFinite(day) || day <= 0) continue;

      const key = `${monthYear.year}-${String(monthYear.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (/\bday-rented\b/i.test(attrs)) {
        occupancy.set(key, "BOOKED");
      } else if (
        /\bday-checkin\b/i.test(attrs) ||
        /\bday-checkout\b/i.test(attrs)
      ) {
        if (!occupancy.has(key)) occupancy.set(key, "OPTION");
      }
    }
  }

  return occupancy;
}

function extractTatilkentimVillaId(html: string): string | null {
  return html.match(/\/villa\/(\d+)\/calendar/i)?.[1] ?? null;
}

async function scrapeTatilkentimFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  if (!looksLikeTatilkentim(pageUrl, html)) return null;

  const deposit = extractDamageDeposit(html);
  const periods = parseTatilkentimPricingItems(html, deposit);
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  const villaId = extractTatilkentimVillaId(html);

  if (villaId) {
    await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
    try {
      const calendarHtml = await fetchText(
        `${originFromUrl(pageUrl)}/villa/${encodeURIComponent(villaId)}/calendar`,
        { referer: pageUrl }
      );
      for (const [key, value] of parseTatilkentimCalendarOccupancy(
        calendarHtml
      )) {
        occupancyByDateKey.set(key, value);
      }
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Tatilkentim takvim sayfası alınamadı: ${error.message}`
          : "Tatilkentim takvim sayfası alınamadı"
      );
    }
  } else {
    warnings.push("Tatilkentim villa id (calendar) bulunamadı");
  }

  if (periods.length === 0) return null;

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Tatilkentim fiyatları alındı; müsaitlik takvimi okunamadı veya boş"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "tatilkentim",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

const VILLASAYFAM_API = "https://api.villasayfam.com";

function looksLikeVillasayfam(pageUrl: string): boolean {
  try {
    return normalizeHost(new URL(pageUrl).hostname).includes("villasayfam");
  } catch {
    return false;
  }
}

function extractVillasayfamSlug(pageUrl: string): string | null {
  try {
    const match = new URL(pageUrl).pathname.match(/\/villa\/([^/]+)\/?$/i);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

async function fetchVillasayfamJson<T>(
  pathAndQuery: string,
  referer: string
): Promise<T> {
  const response = await fetch(`${VILLASAYFAM_API}${pathAndQuery}`, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json, text/plain, */*",
      Origin: "https://www.villasayfam.com",
      Referer: referer,
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Villa Sayfam API ${response.status}: ${pathAndQuery}`);
  }
  return (await response.json()) as T;
}

type VillasayfamPricePeriodRow = {
  startDate?: string;
  endDate?: string;
  price?: number;
  currency?: string;
  minStay?: number | null;
};

type VillasayfamAvailabilityRow = {
  source?: string;
  startDate?: string;
  endDate?: string;
};

export function parseVillasayfamPricePeriods(
  rows: VillasayfamPricePeriodRow[],
  damageDeposit: number | null
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  let sourceId = 1;

  for (const row of rows) {
    const startDate = parseIsoLikeDate(String(row.startDate ?? ""));
    const endDate = parseIsoLikeDate(String(row.endDate ?? ""));
    const nightlyPrice = positiveInt(Number(row.price));
    if (!startDate || !endDate || !nightlyPrice) continue;
    if (compareDates(startDate, endDate) > 0) continue;

    const currency = mapCurrencyCode(row.currency);
    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate,
        endDate,
        nightlyPrice,
        currency,
        minStayNights: positiveInt(Number(row.minStay)),
        damageDeposit,
        damageDepositCurrency: currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

export function parseVillasayfamAvailability(
  rows: VillasayfamAvailabilityRow[]
): Map<string, VillaDayOccupancy> {
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();

  const sorted = [...rows].sort((a, b) =>
    String(a.startDate ?? "").localeCompare(String(b.startDate ?? ""))
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index]!;
    const source = String(row.source ?? "").toUpperCase();
    if (source && source !== "BLOCK" && source !== "BOOKING") continue;

    const start = parseIsoLikeDate(String(row.startDate ?? ""));
    const end = parseIsoLikeDate(String(row.endDate ?? ""));
    if (!start || !end) continue;

    // Villa Sayfam API: startDate = giriş günü, endDate = son dolu gece (dahil).
    // Örn. 24–27 Temmuz rezervasyonu → start=24, end=26; çıkış 27 sabahı boş kalır.
    const cursor = new Date(start);
    while (compareDates(cursor, end) <= 0) {
      occupancyByDateKey.set(toDateKey(cursor), "BOOKED");
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return occupancyByDateKey;
}

async function scrapeVillasayfamFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  if (!looksLikeVillasayfam(pageUrl)) return null;

  const slug = extractVillasayfamSlug(pageUrl);
  if (!slug) {
    warnings.push("Villa Sayfam slug (URL /villa/{slug}) bulunamadı");
    return null;
  }

  type ApiWrap<T> = { content?: T };
  type VillaContent = {
    id?: string;
    name?: string;
    deposit?: string | number | null;
    pricePeriods?: VillasayfamPricePeriodRow[];
  };

  let villaPayload: ApiWrap<VillaContent>;
  try {
    villaPayload = await fetchVillasayfamJson<ApiWrap<VillaContent>>(
      `/v1/villas/${encodeURIComponent(slug)}`,
      pageUrl
    );
  } catch (error) {
    warnings.push(
      error instanceof Error ? error.message : "Villa Sayfam villa API hatası"
    );
    return null;
  }

  const villa = villaPayload.content;
  const villaUuid = villa?.id?.trim();
  if (!villa || !villaUuid) {
    warnings.push("Villa Sayfam villa UUID alınamadı");
    return null;
  }

  const depositRaw =
    typeof villa.deposit === "number"
      ? villa.deposit
      : Number(String(villa.deposit ?? "").replace(/[^\d.]/g, ""));
  const damageDeposit =
    Number.isFinite(depositRaw) && depositRaw > 0 ? Math.round(depositRaw) : null;

  const periods = parseVillasayfamPricePeriods(villa.pricePeriods ?? [], damageDeposit);
  if (periods.length === 0) {
    warnings.push("Villa Sayfam fiyat periyodu bulunamadı");
    return null;
  }

  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  const today = startOfDay(new Date());
  const rangeStart = periods[0]!.startDate;
  const rangeEnd = periods[periods.length - 1]!.endDate;
  const availStart = compareDates(rangeStart, today) < 0 ? today : rangeStart;
  const availEnd = new Date(rangeEnd);
  availEnd.setMonth(availEnd.getMonth() + 6);

  await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
  try {
    const startKey = toDateKey(availStart);
    const endKey = toDateKey(availEnd);
    const availPayload = await fetchVillasayfamJson<
      ApiWrap<{ data?: VillasayfamAvailabilityRow[] }>
    >(
      `/v1/villas/${encodeURIComponent(villaUuid)}/availability?startDate=${startKey}&endDate=${endKey}`,
      pageUrl
    );
    for (const [key, value] of parseVillasayfamAvailability(
      availPayload.content?.data ?? []
    )) {
      occupancyByDateKey.set(key, value);
    }
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `Villa Sayfam müsaitlik API: ${error.message}`
        : "Villa Sayfam müsaitlik API alınamadı"
    );
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Villa Sayfam fiyatları alındı; müsaitlik takvimi boş veya okunamadı"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "villasayfam",
    pageTitle: villa.name?.trim() || extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

function looksLikeYazlikcim(pageUrl: string): boolean {
  try {
    return normalizeHost(new URL(pageUrl).hostname).includes("yazlikcim");
  } catch {
    return false;
  }
}

/** schema.org AggregateOffer veya detay kutusundaki min-max gecelik. */
export function extractYazlikcimPriceRange(
  html: string
): { low: number; high: number; currency: VillaPeriodCurrency } | null {
  const schema =
    html.match(
      /"@type"\s*:\s*"AggregateOffer"[\s\S]*?"lowPrice"\s*:\s*"([\d.]+)"[\s\S]*?"highPrice"\s*:\s*"([\d.]+)"/i
    ) ??
    html.match(/"lowPrice"\s*:\s*"([\d.]+)"[\s\S]*?"highPrice"\s*:\s*"([\d.]+)"/i) ??
    html.match(/lowPrice\\":\\"([\d.]+)\\",\\"highPrice\\":\\"([\d.]+)/) ??
    html.match(/"lowPrice"\s*:\s*"([\d.]+)"[\s\S]*?"highPrice"\s*:\s*null/i) ??
    html.match(/lowPrice\\":\\"([\d.]+)\\",\\"highPrice\\":null/);
  if (schema) {
    const low = Math.round(parseLocalizedMoney(schema[1]!));
    const high = schema[2]
      ? Math.round(parseLocalizedMoney(schema[2]))
      : low;
    if (low > 0 && high >= low) {
      return { low, high, currency: "TL" };
    }
  }

  const hero = html.match(
    /paymentRspFs[^>]*>[\s\S]{0,500}?data-price=["'](\d+)["'][\s\S]{0,120}?data-price=["'](\d+)["']/i
  );
  if (hero) {
    const low = Number(hero[1]);
    const high = Number(hero[2]);
    if (low > 0 && high >= low) {
      return { low, high, currency: "TL" };
    }
  }

  return null;
}

const YAZLIKCIM_MONTH_NAMES: Record<string, number> = {
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

function parseYazlikcimMonthList(raw: string): number[] {
  const months = new Set<number>();
  const chunks = raw.split(/,|ve/gi);
  for (const chunk of chunks) {
    const normalized = chunk
      .toLocaleLowerCase("tr-TR")
      .replace(/&uuml;/g, "ü")
      .replace(/&ouml;/g, "ö")
      .replace(/&ccedil;/g, "ç")
      .replace(/&nbsp;/g, " ")
      .trim();
    for (const [name, month] of Object.entries(YAZLIKCIM_MONTH_NAMES)) {
      if (normalized.includes(name)) months.add(month);
    }
  }
  return [...months].sort((a, b) => a - b);
}

/** SSS metnindeki kış / düşük / yüksek sezon ayları. */
export function parseYazlikcimSeasonMonths(html: string): {
  winter: number[];
  low: number[];
  high: number[];
} {
  const defaults = {
    winter: [1, 2, 3, 4, 11, 12],
    low: [5, 6, 9, 10],
    high: [7, 8],
  };

  const text = stripTags(html);
  const winterMatch = text.match(
    /([A-Za-zÇĞİÖŞÜçğıöşü,&\s]+)\s+aylar[ıi]\s+K[ıi]ş\s+Sezon/i
  );
  const lowMatch = text.match(
    /([A-Za-zÇĞİÖŞÜçğıöşü,&\s]+)\s+aylar[ıi]\s+D[üu]ş[üu]k\s+Sezon/i
  );
  const highMatch = text.match(
    /([A-Za-zÇĞİÖŞÜçğıöşü,&\s]+)\s+aylar[ıi]\s+Y[üu]ksek\s+Sezon/i
  );

  const winter = winterMatch ? parseYazlikcimMonthList(winterMatch[1]!) : defaults.winter;
  const low = lowMatch ? parseYazlikcimMonthList(lowMatch[1]!) : defaults.low;
  const high = highMatch ? parseYazlikcimMonthList(highMatch[1]!) : defaults.high;

  if (winter.length === 0 || low.length === 0 || high.length === 0) {
    return defaults;
  }
  return { winter, low, high };
}

function lastDayOfMonth(year: number, month: number): Date {
  return startOfDay(new Date(year, month, 0));
}

function monthTier(
  month: number,
  seasons: { winter: number[]; low: number[]; high: number[] }
): "winter" | "low" | "high" | null {
  if (seasons.winter.includes(month)) return "winter";
  if (seasons.low.includes(month)) return "low";
  if (seasons.high.includes(month)) return "high";
  return null;
}

/** Takvim günlük fiyatı yoksa schema min-max + sezon aylarından yıllık periyot üretir. */
export function buildYazlikcimSeasonFallbackPeriods(
  html: string,
  damageDeposit?: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  const range = extractYazlikcimPriceRange(html);
  if (!range) return [];

  const seasons = parseYazlikcimSeasonMonths(html);
  const midPrice = Math.round((range.low + range.high) / 2);
  const tierPrice: Record<"winter" | "low" | "high", number> = {
    winter: range.low,
    low: midPrice,
    high: range.high,
  };

  const nowYear = new Date().getFullYear();
  const years = [nowYear, nowYear + 1];
  const periods: MappedVillaPricePeriod[] = [];
  let sourceId = 1;

  for (const year of years) {
    let runTier: "winter" | "low" | "high" | null = null;
    let runStartMonth = 1;

    const flushRun = (endMonth: number) => {
      if (!runTier) return;
      periods.push(
        buildMappedPeriod({
          sourceId: sourceId++,
          startDate: startOfDay(new Date(year, runStartMonth - 1, 1)),
          endDate: lastDayOfMonth(year, endMonth),
          nightlyPrice: tierPrice[runTier],
          currency: range.currency,
          damageDeposit: damageDeposit?.amount ?? null,
          damageDepositCurrency: damageDeposit?.currency ?? range.currency,
        })
      );
      runTier = null;
    };

    for (let month = 1; month <= 12; month++) {
      const tier = monthTier(month, seasons);
      if (!tier) continue;
      if (runTier === tier) continue;
      if (runTier) flushRun(month - 1);
      runTier = tier;
      runStartMonth = month;
    }
    if (runTier) flushRun(12);
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

function looksLikeVillaoteltatili(pageUrl: string, html: string): boolean {
  try {
    const host = normalizeHost(new URL(pageUrl).hostname);
    if (host.includes("villaoteltatili")) return true;
  } catch {
    // ignore
  }
  return (
    html.includes("bravo_booking_data") &&
    (html.includes("loadDates") || html.includes("load_dates_url"))
  );
}

function extractVillaoteltatiliMeta(html: string): {
  serviceId: string | null;
  loadDatesUrl: string | null;
} {
  const bravoMatch = html.match(/bravo_booking_data\s*=\s*(\{[\s\S]*?\})\s*[\r\n;]/);
  if (bravoMatch?.[1]) {
    try {
      const data = JSON.parse(bravoMatch[1]) as { id?: number | string };
      if (data.id != null && String(data.id).trim()) {
        const loadDatesUrl =
          html.match(/load_dates_url\s*:\s*['"]([^'"]+)['"]/i)?.[1] ??
          html.match(
            /availability\/loadDates["']?\s*,[\s\S]{0,120}?url\s*:\s*["']([^"']+)["']/i
          )?.[1] ??
          null;
        return { serviceId: String(data.id), loadDatesUrl };
      }
    } catch {
      // fall through
    }
  }

  const hiddenId = html.match(
    /<input[^>]+name=["']service_id["'][^>]+value=["'](\d+)["']/i
  )?.[1];
  const loadDatesUrl =
    html.match(/load_dates_url\s*:\s*['"]([^'"]+)['"]/i)?.[1] ?? null;
  return {
    serviceId: hiddenId?.trim() || null,
    loadDatesUrl,
  };
}

function extractVillaoteltatiliPrepaymentRate(html: string): number | null {
  const percentMatch = html.match(
    /"deposit_type"\s*:\s*"percent"[\s\S]{0,80}?"deposit_amount"\s*:\s*"(\d{1,3})"/i
  );
  if (percentMatch?.[1]) return parsePercentRate(percentMatch[1]);
  const percentAlt = html.match(
    /"deposit_amount"\s*:\s*"(\d{1,3})"[\s\S]{0,80}?"deposit_type"\s*:\s*"percent"/i
  );
  if (percentAlt?.[1]) return parsePercentRate(percentAlt[1]);
  return null;
}

function parseVillaoteltatiliDateRange(
  raw: string
): { start: Date; end: Date } | null {
  const text = decodeHtmlEntities(raw)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;

  const parsePart = (value: string): Date | null => {
    const key = normalizeLooseDateKey(value.trim());
    return key ? parseDateKey(key) : null;
  };

  const start = parsePart(parts[0]!);
  const end = parsePart(parts[1]!);
  if (!start || !end || compareDates(start, end) > 0) return null;
  return { start, end };
}

export function parseVillaoteltatiliPriceTable(
  html: string,
  damageDeposit?: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  const seen = new Set<string>();
  let sourceId = 1;

  const chunks = html.split(
    /<div[^>]*class=["'][^"']*\bliketablerow\b[^"']*["'][^>]*>/i
  );

  for (let i = 1; i < chunks.length; i++) {
    const block = (chunks[i] ?? "").slice(0, 2500);
    const text = stripTags(block);
    const rangeMatch = text.match(
      /(\d{1,2}\.\d{1,2}\.\d{2,4})\s*[-–—]\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/
    );
    if (!rangeMatch) continue;

    const range = parseVillaoteltatiliDateRange(
      `${rangeMatch[1]} - ${rangeMatch[2]}`
    );
    if (!range) continue;

    const nightlyMatch =
      block.match(/(\d[\d.,]*)\s*₺[^<]{0,40}Gecelik/i) ??
      text.match(/(\d[\d.,]*)\s*₺[^A-Za-z]{0,20}Gecelik/i);
    if (!nightlyMatch?.[1]) continue;

    const nightlyPrice = parseTurkishMoneyAmount(nightlyMatch[1]);
    if (!nightlyPrice) continue;

    const weeklyMatch =
      block.match(/(\d[\d.,]*)\s*₺[^<]{0,40}Haftal/i) ??
      text.match(/(\d[\d.,]*)\s*₺[^A-Za-z]{0,20}Haftal/i);
    const weeklyPrice = weeklyMatch?.[1]
      ? parseTurkishMoneyAmount(weeklyMatch[1])
      : null;

    const dedupeKey = `${toDateKey(range.start)}|${toDateKey(range.end)}|${nightlyPrice}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice,
        currency: "TL",
        weeklyPrice,
        damageDeposit: damageDeposit?.amount ?? null,
        damageDepositCurrency: damageDeposit?.currency ?? "TL",
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

type VillaoteltatiliCalendarEvent = {
  start?: string;
  start_date?: string;
  end?: string;
  price?: string | number;
  active?: number;
  event?: string;
  title?: string;
  is_default?: boolean;
  classNames?: string[];
};

function villaoteltatiliEventDateKey(
  event: VillaoteltatiliCalendarEvent
): string | null {
  const raw =
    event.start ??
    (typeof event.start_date === "string" ? event.start_date.slice(0, 10) : "");
  return normalizeLooseDateKey(String(raw ?? ""));
}

function isVillaoteltatiliBlockedEvent(
  event: VillaoteltatiliCalendarEvent
): boolean {
  if (event.is_default) return false;
  if (event.active !== 0) return false;
  const label = String(event.event ?? event.title ?? "");
  if (/engellen/i.test(label)) return true;
  return (event.classNames ?? []).some((name) => /blocked/i.test(name));
}

export function parseVillaoteltatiliOccupancy(
  events: VillaoteltatiliCalendarEvent[]
): Map<string, VillaDayOccupancy> {
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  for (const event of events) {
    if (!isVillaoteltatiliBlockedEvent(event)) continue;
    const key = villaoteltatiliEventDateKey(event);
    if (!key) continue;
    occupancyByDateKey.set(key, "BOOKED");
  }
  return occupancyByDateKey;
}

export function parseVillaoteltatiliDailyPrices(
  events: VillaoteltatiliCalendarEvent[]
): { dateKeys: string[]; prices: number[] } {
  const sorted = [...events].sort((a, b) =>
    String(a.start ?? a.start_date ?? "").localeCompare(
      String(b.start ?? b.start_date ?? "")
    )
  );
  const dateKeys: string[] = [];
  const prices: number[] = [];

  for (const event of sorted) {
    if (event.active !== 1) continue;
    const price = Number(event.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const key = villaoteltatiliEventDateKey(event);
    if (!key) continue;
    dateKeys.push(key);
    prices.push(Math.round(price));
  }

  return { dateKeys, prices };
}

async function fetchVillaoteltatiliLoadDates(
  pageUrl: string,
  serviceId: string,
  loadDatesUrl: string
): Promise<VillaoteltatiliCalendarEvent[]> {
  const startDate = startOfDay(new Date());
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  const url = new URL(loadDatesUrl, originFromUrl(pageUrl));
  url.searchParams.set("id", serviceId);
  url.searchParams.set("start", toDateKey(startDate));
  url.searchParams.set("end", toDateKey(endDate));

  const body = await fetchText(url.toString(), { referer: pageUrl });
  const parsed = JSON.parse(body) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("loadDates yanıtı dizi değil");
  }
  return parsed as VillaoteltatiliCalendarEvent[];
}

async function scrapeVillaoteltatiliFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  if (!looksLikeVillaoteltatili(pageUrl, html)) return null;

  const meta = extractVillaoteltatiliMeta(html);
  if (!meta.serviceId) {
    warnings.push("VillaOtelTatili service id bulunamadı");
    return null;
  }

  const deposit = extractDamageDeposit(html);
  let periods = parseVillaoteltatiliPriceTable(html, deposit);
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  const prepaymentRate = extractVillaoteltatiliPrepaymentRate(html);
  const loadDatesUrl =
    meta.loadDatesUrl ??
    `${originFromUrl(pageUrl)}/user/kiralik-villa/availability/loadDates`;

  try {
    await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
    const events = await fetchVillaoteltatiliLoadDates(
      pageUrl,
      meta.serviceId,
      loadDatesUrl
    );
    const occ = parseVillaoteltatiliOccupancy(events);
    for (const [key, status] of occ) occupancyByDateKey.set(key, status);

    if (periods.length === 0) {
      const { dateKeys, prices } = parseVillaoteltatiliDailyPrices(events);
      periods = collapseDailyPricesToPeriods(dateKeys, prices, "TL");
      if (periods.length > 0) {
        warnings.push(
          "Dönem listesi HTML'de yoktu; takvim günlük fiyatlarından birleştirildi"
        );
      }
    }
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `VillaOtelTatili loadDates başarısız: ${error.message}`
        : "VillaOtelTatili loadDates başarısız"
    );
  }

  if (periods.length === 0) return null;

  if (prepaymentRate) {
    for (const period of periods) {
      if (!period.prepaymentRate) period.prepaymentRate = prepaymentRate;
    }
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "villaoteltatili",
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
  const isYazlikcim = looksLikeYazlikcim(pageUrl);
  const deposit = extractDamageDeposit(html);
  let periods = parseBoceksoftPeriodList(html, deposit);
  if (periods.length === 0) {
    periods = parseBoceksoftPriceRangeRows(html, deposit);
  }
  const meta = extractBoceksoftCalendarMeta(html);
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  let usedYazlikcimFallback = false;

  const looksBocek =
    host.includes("dalvillalari") ||
    host.includes("kiralikvilladatatil") ||
    isYazlikcim ||
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

  if (periods.length === 0 && isYazlikcim) {
    periods = buildYazlikcimSeasonFallbackPeriods(html, deposit);
    if (periods.length > 0) {
      usedYazlikcimFallback = true;
      warnings.push(
        "Yazlıkçım takviminde günlük fiyat yok; schema.org min-max ve sezon açıklamasından tahmini periyot oluşturuldu"
      );
    }
  }

  if (periods.length === 0) return null;

  return {
    sourceHost: host,
    strategy: usedYazlikcimFallback ? "yazlikcim" : "boceksoft",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

const VILLAVILLAM_API = "https://api.villavillam.com.tr";
const VILLACIM_API = "https://api.villacim.com.tr";
const TATILPREMIUM_API = "https://api.tatilpremium.com";
const VILLAPAKETI_API = "https://api.villapaketi.com";
const VILLACINIZ_API = "https://api.villaciniz.com.tr";
const VILLAYOLU_API = "https://api.villayolu.com";
const MUSTAKILVILLAM_API = "https://api.mustakilvillam.com";
const MYVILLACITY_API = "https://api.myvillacity.com";
const VILLAKILAVUZU_API = "https://api.villakilavuzu.com";

type VillaApiSiteConfig = {
  apiHost: string;
  origin: string;
  hostKey:
    | "villavillam"
    | "villacim"
    | "tatilpremium"
    | "villapaketi"
    | "villaciniz"
    | "villayolu"
    | "mustakilvillam"
    | "myvillacity"
    | "villakilavuzu";
};

function resolveVillaApiSite(pageUrl: string): VillaApiSiteConfig | null {
  try {
    const host = normalizeHost(new URL(pageUrl).hostname);
    if (host.includes("villavillam")) {
      return {
        apiHost: VILLAVILLAM_API,
        origin: "https://www.villavillam.com.tr",
        hostKey: "villavillam",
      };
    }
    if (host.includes("villacim")) {
      return {
        apiHost: VILLACIM_API,
        origin: "https://www.villacim.com.tr",
        hostKey: "villacim",
      };
    }
    if (host.includes("tatilpremium")) {
      return {
        apiHost: TATILPREMIUM_API,
        origin: "https://www.tatilpremium.com",
        hostKey: "tatilpremium",
      };
    }
    if (host.includes("villapaketi")) {
      return {
        apiHost: VILLAPAKETI_API,
        origin: "https://www.villapaketi.com",
        hostKey: "villapaketi",
      };
    }
    if (host.includes("villaciniz")) {
      return {
        apiHost: VILLACINIZ_API,
        origin: "https://www.villaciniz.com.tr",
        hostKey: "villaciniz",
      };
    }
    if (host.includes("villayolu")) {
      return {
        apiHost: VILLAYOLU_API,
        origin: "https://www.villayolu.com",
        hostKey: "villayolu",
      };
    }
    if (host.includes("mustakilvillam")) {
      return {
        apiHost: MUSTAKILVILLAM_API,
        origin: "https://www.mustakilvillam.com",
        hostKey: "mustakilvillam",
      };
    }
    if (host.includes("myvillacity")) {
      return {
        apiHost: MYVILLACITY_API,
        origin: "https://www.myvillacity.com",
        hostKey: "myvillacity",
      };
    }
    if (host.includes("villakilavuzu")) {
      return {
        apiHost: VILLAKILAVUZU_API,
        origin: "https://www.villakilavuzu.com",
        hostKey: "villakilavuzu",
      };
    }
  } catch {
    return null;
  }
  return null;
}

function looksLikeVillaApiSite(pageUrl: string): boolean {
  return resolveVillaApiSite(pageUrl) !== null;
}

/** @deprecated resolveVillaApiSite kullanın */
function looksLikeVillavillam(pageUrl: string): boolean {
  return looksLikeVillaApiSite(pageUrl);
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

function extractVillaApiEntity(html: string): {
  entityId: string;
  title: string | null;
  symbol: string | null;
  currencyCode: string | null;
  damageDeposit: number | null;
  result: Record<string, unknown>;
} | null {
  const data = parseNextDataJson(html);
  if (!data || typeof data !== "object") return null;
  const dataNode = (
    data as { props?: { pageProps?: { data?: Record<string, unknown> } } }
  ).props?.pageProps?.data;
  if (!dataNode || typeof dataNode !== "object") return null;
  const nested = dataNode.result;
  const result =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : dataNode;
  const entityId = String(result.id ?? "").trim();
  if (!entityId) return null;
  const hasarRaw = result.hasar ?? result.depozito;
  const damageDeposit =
    typeof hasarRaw === "number"
      ? hasarRaw
      : typeof hasarRaw === "string"
        ? Number(String(hasarRaw).replace(/[^\d.]/g, ""))
        : NaN;
  return {
    entityId,
    title:
      typeof result.baslik === "string"
        ? result.baslik
        : typeof result.title === "string"
          ? result.title
          : null,
    symbol: typeof result.Symbol === "string" ? result.Symbol : null,
    currencyCode:
      typeof result.CurrencyCode === "string" ? result.CurrencyCode : null,
    damageDeposit:
      Number.isFinite(damageDeposit) && damageDeposit > 0 ? damageDeposit : null,
    result,
  };
}

function extractVillaApiEntityMeta(
  result: Record<string, unknown>
): ScrapedVillaPeriodMeta {
  const prepaymentRate = parsePercentRate(
    String(
      result.onOdemeOrani ??
        result.onodemeorani ??
        result.onOdeme ??
        result.kaporaOrani ??
        result.prepaymentRate ??
        ""
    )
  );
  const commissionRate = parsePercentRate(
    String(
      result.komisyonOrani ??
        result.komisyonorani ??
        result.komisyon ??
        result.commissionRate ??
        ""
    )
  );
  const cleaningDayCount = positiveInt(
    Number(
      result.temizlikGun ??
        result.temizlikgun ??
        result.temizlikGunSayisi ??
        result.temizlikGece ??
        result.temizlikgece ??
        result.cleaningDayCount ??
        NaN
    )
  );
  const cleaningFee = positiveInt(
    Number(
      result.temizlikFiyat ??
        result.temizlikfiyat ??
        result.temizlik_fiyat ??
        NaN
    )
  );

  return {
    prepaymentRate,
    commissionRate,
    cleaningDayCount,
    cleaningFee,
    cleaningFeeCurrency: cleaningFee != null ? "TL" : undefined,
    damageDeposit: null,
    damageDepositCurrency: undefined,
  };
}

/** @deprecated extractVillaApiEntity kullanın */
function extractVillavillamEntity(html: string) {
  return extractVillaApiEntity(html);
}

/** Next.js RSC `routingData` içinden villa entity id (tatilpremium, villapaketi, villaciniz, villayolu). */
export function extractTatilpremiumRoutingEntity(
  html: string,
  pageUrl: string
): ReturnType<typeof extractVillaApiEntity> {
  let slug = "";
  try {
    const parts = new URL(pageUrl).pathname.split("/").filter(Boolean);
    slug = parts[parts.length - 1] ?? "";
  } catch {
    return null;
  }
  if (!slug) return null;

  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockMatch = html.match(
    new RegExp(
      `routingData\\\\":\\{\\\\"id\\\\":\\\\"(\\d+)\\\\"[\\s\\S]*?\\\\"url\\\\":\\\\"/${escapedSlug}\\\\"`,
      "i"
    )
  );
  if (!blockMatch?.[1]) return null;

  const start = blockMatch.index ?? html.indexOf(blockMatch[0]);
  const chunk = html.slice(start, start + 12000);
  const hasarRaw = chunk.match(/\\"hasar\\":\\"([^\\]+)\\"/)?.[1];
  const damageDeposit = hasarRaw
    ? Number(String(hasarRaw).replace(/[^\d.]/g, ""))
    : NaN;

  return {
    entityId: blockMatch[1],
    title: chunk.match(/\\"baslik\\":\\"([^\\]+)\\"/)?.[1] ?? null,
    symbol: chunk.match(/\\"Symbol\\":\\"([^\\]+)\\"/)?.[1] ?? "₺",
    currencyCode:
      chunk.match(/\\"FromCurrencyCode\\":\\"([^\\]+)\\"/)?.[1] ?? "TRY",
    damageDeposit:
      Number.isFinite(damageDeposit) && damageDeposit > 0 ? damageDeposit : null,
    result: {},
  };
}

function apiCurrencyParam(
  site: VillaApiSiteConfig,
  symbol: string | null | undefined,
  currencyCode: string | null | undefined
): string {
  const { apiCurrency } = currencyFromVillavillamSymbol(symbol);
  if (site.hostKey === "villacim") {
    if (currencyCode === "TRY" || apiCurrency === "TL") return "tl";
    if (apiCurrency === "EUR") return "eur";
    if (apiCurrency === "USD") return "dolar";
    if (apiCurrency === "GBP") return "gbp";
    return "tl";
  }
  return apiCurrency;
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

async function fetchVillaApiJson<T>(
  site: VillaApiSiteConfig,
  pathAndQuery: string,
  referer: string
): Promise<T> {
  const response = await fetch(`${site.apiHost}${pathAndQuery}`, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json, text/plain, */*",
      Origin: site.origin,
      Referer: referer,
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Villa API ${response.status}: ${pathAndQuery}`);
  }
  return (await response.json()) as T;
}

/** @deprecated fetchVillaApiJson kullanın */
async function fetchVillavillamJson<T>(
  pathAndQuery: string,
  referer: string
): Promise<T> {
  return fetchVillaApiJson<T>(
    {
      apiHost: VILLAVILLAM_API,
      origin: "https://www.villavillam.com.tr",
      hostKey: "villavillam",
    },
    pathAndQuery,
    referer
  );
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

    const cleaningFee = Number(
      o.temizlikFiyat ?? o.temizlikfiyat ?? o.temizlik_fiyat
    );
    const infoCleaning = parseCleaningRuleText(
      typeof o.info === "string" ? o.info : null
    );
    const prepaymentRate = parsePercentRate(
      String(
        o.onOdemeOrani ??
          o.onodemeorani ??
          o.kapora ??
          o.prepaymentRate ??
          ""
      )
    );
    const commissionRate = parsePercentRate(
      String(o.komisyonOrani ?? o.komisyonorani ?? o.komisyon ?? "")
    );
    let cleaningDayCount = positiveInt(
      Number(
        o.temizlikGun ??
          o.temizlikgun ??
          o.temizlikGece ??
          o.temizlikgece ??
          o.cleaningDayCount ??
          NaN
      )
    );
    if (cleaningDayCount == null) {
      cleaningDayCount = infoCleaning.cleaningDayCount;
    }
    const resolvedCleaningFee =
      Number.isFinite(cleaningFee) && cleaningFee > 0
        ? Math.round(cleaningFee)
        : infoCleaning.cleaningFee;
    const resolvedCleaningFeeCurrency =
      Number.isFinite(cleaningFee) && cleaningFee > 0
        ? currency
        : resolvedCleaningFee != null
          ? infoCleaning.cleaningFeeCurrency
          : currency;
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
        prepaymentRate,
        commissionRate,
        cleaningDayCount,
        cleaningFee: resolvedCleaningFee,
        cleaningFeeCurrency: resolvedCleaningFeeCurrency,
        damageDeposit,
        damageDepositCurrency: currency,
        discount1Rate,
      })
    );
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
  const site = resolveVillaApiSite(pageUrl);
  if (!site) return null;

  let entity = extractVillaApiEntity(html);
  if (
    !entity &&
    (site.hostKey === "tatilpremium" ||
      site.hostKey === "villapaketi" ||
      site.hostKey === "villaciniz" ||
      site.hostKey === "villayolu" ||
      site.hostKey === "mustakilvillam" ||
      site.hostKey === "myvillacity" ||
      site.hostKey === "villakilavuzu")
  ) {
    entity = extractTatilpremiumRoutingEntity(html, pageUrl);
  }
  if (!entity) {
    warnings.push(
      `${site.hostKey} villa id bulunamadı (__NEXT_DATA__ veya routingData)`
    );
    return null;
  }

  const apiCurrency = apiCurrencyParam(
    site,
    entity.symbol,
    entity.currencyCode
  );
  const { currency: symbolCurrency } = currencyFromVillavillamSymbol(
    entity.symbol
  );

  await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
  let priceRows: unknown[] = [];
  try {
    const priceJson = await fetchVillaApiJson<{
      data?: unknown[];
      error?: string;
    }>(
      site,
      `/PriceList?id=${encodeURIComponent(entity.entityId)}&currency=${encodeURIComponent(apiCurrency)}&start2=`,
      pageUrl
    );
    priceRows = Array.isArray(priceJson.data) ? priceJson.data : [];
    if (priceRows.length === 0 && priceJson.error) {
      warnings.push(`${site.hostKey} PriceList: ${priceJson.error}`);
    }
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `${site.hostKey} PriceList başarısız: ${error.message}`
        : `${site.hostKey} PriceList başarısız`
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
      const availJson = await fetchVillaApiJson<{
        Symbol?: string;
        data?: Record<string, unknown>;
      }>(site, query, pageUrl);
      availability = parseVillavillamAvailability(availJson);
    } catch {
      // Sonraki parametreyle dene
    }
  }

  const hasAvailabilityCalendar = (parsed: {
    occupancyByDateKey: Map<string, VillaDayOccupancy>;
    dailyDateKeys: string[];
  } | null): boolean =>
    Boolean(
      parsed &&
        (parsed.occupancyByDateKey.size > 0 || parsed.dailyDateKeys.length > 0)
    );

  if (!hasAvailabilityCalendar(availability)) {
    availability =
      parseVillavillamAvailabilityFromResult(entity.result, entity.symbol) ??
      availability;
  }

  if (!hasAvailabilityCalendar(availability)) {
    warnings.push(
      `${site.hostKey} Availability API boş döndü; sayfa verisinden müsaitlik okunamadı`
    );
  }

  const currency = availability?.currency ?? symbolCurrency;
  let periods = parseVillavillamPriceList(
    priceRows,
    currency,
    entity.damageDeposit
  );

  const entityMeta = extractVillaApiEntityMeta(entity.result);
  const emptyDefaults: ScrapedVillaPeriodDefaults = {
    prepaymentRate: null,
    commissionRate: null,
    cleaningDayCount: null,
    cleaningFee: null,
    cleaningFeeCurrency: "TL",
    damageDeposit: null,
    damageDepositCurrency: "TL",
  };
  for (const period of periods) {
    applyMetaToPeriod(period, entityMeta, emptyDefaults);
  }

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
        `${site.hostKey} dönem listesi boştu; günlük fiyatlardan birleştirildi`
      );
    }
  }

  if (periods.length === 0) return null;

  const occupancyByDateKey =
    availability?.occupancyByDateKey ?? new Map<string, VillaDayOccupancy>();
  if (
    occupancyByDateKey.size === 0 &&
    (availability?.dailyDateKeys.length ?? 0) === 0
  ) {
    warnings.push(
      `${site.hostKey} fiyatları alındı; müsaitlik takvimi bulunamadı (tüm günler boş kabul edildi)`
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy:
      site.hostKey === "villacim"
        ? "villacim"
        : site.hostKey === "tatilpremium"
          ? "tatilpremium"
          : site.hostKey === "villapaketi"
            ? "villapaketi"
            : site.hostKey === "villaciniz"
              ? "villaciniz"
              : site.hostKey === "villayolu"
                ? "villayolu"
                : site.hostKey === "mustakilvillam"
                  ? "mustakilvillam"
                  : site.hostKey === "myvillacity"
                    ? "myvillacity"
                    : site.hostKey === "villakilavuzu"
                      ? "villakilavuzu"
                      : "villavillam",
    pageTitle: entity.title ?? extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

function parseJsonValueAt(html: string, start: number): unknown | null {
  const open = html[start];
  if (open !== "{" && open !== "[") return null;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i]!;
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractEmbeddedJsonField(
  html: string,
  objectMarker: string,
  field: string
): unknown | null {
  const objectPos = html.indexOf(objectMarker);
  if (objectPos === -1) return null;
  const fieldToken = `"${field}":`;
  const fieldPos = html.indexOf(fieldToken, objectPos);
  if (fieldPos === -1) return null;
  let i = fieldPos + fieldToken.length;
  while (i < html.length && /\s/.test(html[i]!)) i++;
  return parseJsonValueAt(html, i);
}

/** Next.js RSC flight payload içindeki kaçışlı JSON ({\"key\":...}). */
function parseFlightEscapedJsonValueAt(
  html: string,
  start: number
): unknown | null {
  const open = html[start];
  if (open !== "{" && open !== "[") return null;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    const ch = html[i]!;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const raw = html.slice(start, i + 1);
        const normalized = raw.replace(/\\+"/g, '"');
        try {
          return JSON.parse(normalized);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function findAkdenizvillamEmbeddedFieldStart(
  html: string,
  field: string
): number {
  const markers = [`\\"${field}\\":`, `"${field}":`];
  for (const marker of markers) {
    const pos = html.indexOf(marker);
    if (pos >= 0) {
      let i = pos + marker.length;
      while (i < html.length && /\s/.test(html[i]!)) i++;
      return i;
    }
  }
  return -1;
}

function looksLikeAkdenizvillam(pageUrl: string): boolean {
  try {
    return normalizeHost(new URL(pageUrl).hostname).includes("akdenizvillam");
  } catch {
    return false;
  }
}

const TATILVILLASI_API_TOKEN_FALLBACK = "X7KpR9sT2wY1zN";

function looksLikeTatilvillasi(pageUrl: string): boolean {
  try {
    return normalizeHost(new URL(pageUrl).hostname).includes("tatilvillasi");
  } catch {
    return false;
  }
}

function extractTatilvillasiVillaId(
  html: string,
  pageUrl: string
): string | null {
  const fromInitial = html.match(
    /"initialVilla"\s*:\s*\{[\s\S]*?"id"\s*:\s*"(\d+)"/
  )?.[1];
  if (fromInitial) return fromInitial;

  const fromCdn = html.match(/tatilvillasi\.b-cdn\.net\/villa\/(\d+)\//i)?.[1];
  if (fromCdn) return fromCdn;

  const slug = pageUrl.match(
    /\/(?:villalar|kiralik-villalar)\/([^/?#]+)/i
  )?.[1];
  if (slug) {
    const fromSlug = html.match(
      new RegExp(
        `"slug"\\s*:\\s*"${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?"id"\\s*:\\s*"(\\d+)"`,
        "i"
      )
    )?.[1];
    if (fromSlug) return fromSlug;
  }

  return null;
}

function extractTatilvillasiApiToken(html: string): string {
  const fromEscaped = html.match(/token\\?=([A-Za-z0-9]+)/)?.[1];
  if (fromEscaped && fromEscaped.length >= 8) return fromEscaped;
  const fromPlain = html.match(/token=([A-Za-z0-9]+)/)?.[1];
  if (fromPlain && fromPlain.length >= 8) return fromPlain;
  return TATILVILLASI_API_TOKEN_FALLBACK;
}

function parseTatilvillasiPricePayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const pricesData = (row as { prices_data?: { json?: unknown } }).prices_data;
    if (Array.isArray(pricesData?.json)) return pricesData.json;
  }
  return [];
}

function parseTatilvillasiAvailabilityPayload(
  payload: unknown
): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const items: Record<string, unknown>[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const availabilityData = (row as { availability_data?: { json?: unknown } })
      .availability_data;
    if (availabilityData?.json && typeof availabilityData.json === "object") {
      items.push({ json: availabilityData.json });
    }
  }
  return items;
}

function parseTatilvillasiOccupiedDates(
  payload: unknown
): Map<string, VillaDayOccupancy> {
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  if (!payload || typeof payload !== "object") return occupancyByDateKey;
  const dates = (payload as { dates?: unknown }).dates;
  if (!Array.isArray(dates)) return occupancyByDateKey;

  for (const raw of dates) {
    const date = parseIsoLikeDate(String(raw));
    if (date) occupancyByDateKey.set(toDateKey(date), "BOOKED");
  }
  return occupancyByDateKey;
}

async function scrapeTatilvillasiFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  if (!looksLikeTatilvillasi(pageUrl)) return null;

  const villaId = extractTatilvillasiVillaId(html, pageUrl);
  if (!villaId) {
    warnings.push("Tatilvillasi villa kimliği sayfadan okunamadı");
    return null;
  }

  const origin = originFromUrl(pageUrl);
  const token = extractTatilvillasiApiToken(html);
  const referer = pageUrl;

  const pricesPayload = await fetchJson(
    `${origin}/api/prices_function?villas=${encodeURIComponent(villaId)}&token=${encodeURIComponent(token)}`,
    { referer }
  );
  await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);

  const priceRows = parseTatilvillasiPricePayload(pricesPayload);
  const periods = parseAkdenizvillamPriceRows(priceRows);
  if (periods.length === 0) {
    warnings.push("Tatilvillasi fiyat periyotları boş döndü");
    return null;
  }

  let occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  try {
    const availabilityPayload = await fetchJson(
      `${origin}/api/availabilitys_function?villas=${encodeURIComponent(villaId)}&token=${encodeURIComponent(token)}`,
      { referer }
    );
    occupancyByDateKey = parseAkdenizvillamAvailability(
      parseTatilvillasiAvailabilityPayload(availabilityPayload)
    );
    await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
  } catch {
    warnings.push("Tatilvillasi müsaitlik listesi okunamadı");
  }

  try {
    const occupiedPayload = await fetchJson(
      `${origin}/api/availabilitys_function/occupied-dates?token=${encodeURIComponent(token)}&villas=${encodeURIComponent(villaId)}`,
      { referer }
    );
    const occupiedDates = parseTatilvillasiOccupiedDates(occupiedPayload);
    for (const [dateKey, status] of occupiedDates) {
      occupancyByDateKey.set(dateKey, status);
    }
  } catch {
    warnings.push("Tatilvillasi dolu gün listesi okunamadı");
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push("Tatilvillasi müsaitlik verisi boş döndü");
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "tatilvillasi",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

export function parseAkdenizvillamPriceRows(
  rows: unknown[],
  defaultDamageDeposit?: number | null
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  let sourceId = 1;

  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const startDate = parseIsoLikeDate(String(o.check_in ?? ""));
    const endDate = parseIsoLikeDate(String(o.check_out ?? ""));
    const nightlyPrice = Number(o.price);
    if (!startDate || !endDate || compareDates(startDate, endDate) > 0) continue;
    if (!Number.isFinite(nightlyPrice) || nightlyPrice <= 0) continue;

    const damageDeposit = Number(o.damage_deposit);
    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate,
        endDate,
        nightlyPrice,
        currency: "TL",
        minStayNights: Number.isFinite(Number(o.min_stay))
          ? Number(o.min_stay)
          : null,
        damageDeposit:
          Number.isFinite(damageDeposit) && damageDeposit > 0
            ? damageDeposit
            : (defaultDamageDeposit ?? null),
        damageDepositCurrency: "TL",
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

export function parseAkdenizvillamAvailability(
  items: unknown[]
): Map<string, VillaDayOccupancy> {
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const wrapper = raw as Record<string, unknown>;
    const payload =
      wrapper.json && typeof wrapper.json === "object"
        ? (wrapper.json as Record<string, unknown>)
        : wrapper;
    const status = Number(payload.availabilitys_status ?? payload.status ?? 1);
    if (status !== 1) continue;

    const checkIn = parseIsoLikeDate(String(payload.check_in ?? ""));
    const checkOut = parseIsoLikeDate(String(payload.check_out ?? ""));
    if (!checkIn || !checkOut) continue;

    const cursor = new Date(checkIn);
    while (compareDates(cursor, checkOut) < 0) {
      occupancyByDateKey.set(toDateKey(cursor), "BOOKED");
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return occupancyByDateKey;
}

function scrapeAkdenizvillamFromHtml(
  pageUrl: string,
  html: string,
  warnings: string[]
): ScrapedVillaPage | null {
  if (!looksLikeAkdenizvillam(pageUrl)) return null;
  if (!html.includes("prices_data")) return null;

  const priceFieldStart = findAkdenizvillamEmbeddedFieldStart(html, "prices_data");
  const priceWrapper =
    priceFieldStart >= 0
      ? parseFlightEscapedJsonValueAt(html, priceFieldStart)
      : null;
  const priceRows =
    priceWrapper &&
    typeof priceWrapper === "object" &&
    Array.isArray((priceWrapper as { json?: unknown }).json)
      ? ((priceWrapper as { json: unknown[] }).json ?? [])
      : [];

  const periods = parseAkdenizvillamPriceRows(priceRows);

  let occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  const availFieldStart = findAkdenizvillamEmbeddedFieldStart(
    html,
    "availabilitys_data"
  );
  if (availFieldStart >= 0) {
    const parsed = parseFlightEscapedJsonValueAt(html, availFieldStart);
    if (Array.isArray(parsed)) {
      occupancyByDateKey = parseAkdenizvillamAvailability(parsed);
    }
  }

  if (periods.length === 0) {
    const agg = html.match(
      /"lowPrice"\s*:\s*"(\d+)"[\s\S]*?"highPrice"\s*:\s*"(\d+)"/i
    );
    if (agg) {
      warnings.push(
        "Akdenizvillam periyot listesi okunamadı; schema.org min-max bulundu ancak dönem üretilemedi"
      );
    }
    return null;
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Akdenizvillam fiyatları alındı; müsaitlik listesi boş veya okunamadı"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "akdenizvillam",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

function looksLikeVillavakti(pageUrl: string): boolean {
  try {
    return normalizeHost(new URL(pageUrl).hostname).includes("villavakti");
  } catch {
    return false;
  }
}

function parseVillavaktiDateRange(
  raw: string
): { start: Date; end: Date } | null {
  const text = decodeHtmlEntities(raw)
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;

  const end = parseTurkishLongDate(parts[1]!);
  if (!end) return null;
  const endYear = end.getFullYear();

  let start = parseTurkishLongDate(parts[0]!);
  if (!start) {
    const shortStart = parts[0]!.match(/^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)$/u);
    if (!shortStart) return null;
    start = parseTurkishLongDate(`${shortStart[1]} ${shortStart[2]} ${endYear}`);
  }
  if (!start || compareDates(start, end) > 0) return null;
  return { start, end };
}

export function parseVillavaktiPeriods(
  html: string,
  damageDeposit?: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  const re =
    /<div class="Villa_detay-price-item col-12"(?! pricecolumtitle)[^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  let sourceId = 1;

  while ((match = re.exec(html)) !== null) {
    const block = match[0] ?? "";
    const rangeText = block.match(/<strong>([^<]+)<\/strong>/i)?.[1]?.trim();
    if (!rangeText || !/\d{4}/.test(rangeText)) continue;
    const range = parseVillavaktiDateRange(rangeText);
    if (!range) continue;

    const priceTexts = [
      ...block.matchAll(/Villa_detay-price-item-cash">([^<]+)</gi),
    ].map((m) => m[1]?.trim() ?? "");
    const nightlyRaw = priceTexts[0] ?? "";
    if (!nightlyRaw) continue;

    const currencyMatch = nightlyRaw.match(/(TL|₺|EUR|€|USD|\$|GBP|£)/i);
    const currency = mapCurrencyCode(currencyMatch?.[1]);
    const nightlyPrice = Math.round(
      parseLocalizedMoney(nightlyRaw.replace(/[^\d,.\s]/g, ""))
    );
    if (!Number.isFinite(nightlyPrice) || nightlyPrice <= 0) continue;

    const weeklyRaw = priceTexts[1] ?? "";
    const weeklyPrice = weeklyRaw
      ? Math.round(parseLocalizedMoney(weeklyRaw.replace(/[^\d,.\s]/g, "")))
      : null;
    const minStayNights = Number(
      block.match(/Minimum\s+Kiralama\s*:\s*(\d+)/i)?.[1] ?? ""
    );

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice,
        currency,
        weeklyPrice:
          weeklyPrice && Number.isFinite(weeklyPrice) ? weeklyPrice : null,
        minStayNights: Number.isFinite(minStayNights) ? minStayNights : null,
        damageDeposit: damageDeposit?.amount ?? null,
        damageDepositCurrency: damageDeposit?.currency ?? currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

function scrapeVillavaktiFromHtml(
  pageUrl: string,
  html: string,
  warnings: string[]
): ScrapedVillaPage | null {
  if (!looksLikeVillavakti(pageUrl)) return null;
  if (!html.includes("Villa_detay-price-item")) return null;

  const deposit = extractDamageDeposit(html);
  const periods = parseVillavaktiPeriods(html, deposit);
  if (periods.length === 0) return null;

  if (!html.includes("calendar") && !html.includes("takvim")) {
    warnings.push(
      "Villavakti fiyatları alındı; müsaitlik takvimi otomatik okunamadı"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "villavakti",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey: new Map(),
    warnings,
  };
}

const PRODUCT_DETAIL_RSC_HOSTS = [
  "villaciniz",
  "villapaketi",
  "villayolu",
];

function looksLikeProductDetailRsc(pageUrl: string, html: string): boolean {
  try {
    const host = normalizeHost(new URL(pageUrl).hostname);
    if (!PRODUCT_DETAIL_RSC_HOSTS.some((h) => host.includes(h))) return false;
    return html.includes("self.__next_f") && html.includes("RoutingId");
  } catch {
    return false;
  }
}

function extractProductDetailRscPriceRange(html: string): {
  low: number;
  high: number;
  currency: VillaPeriodCurrency;
  damageDeposit: number | null;
} | null {
  const routingMatch = html.match(/RoutingId\\":\\"(\d+)\\"/);
  const routingId = routingMatch?.[1];
  if (routingId) {
    const marker = `RoutingId\\":\\"${routingId}\\"`;
    const idx = html.indexOf(marker);
    if (idx >= 0) {
      const chunk = html.slice(Math.max(0, idx - 35000), idx + 100);
      const minmax = chunk.match(
        /minfiyat\\":\\"([^\\]+)\\",\\"maxfiyat\\":\\"([^\\]+)/
      );
      const hasar = chunk.match(/hasar\\":\\"([^\\]+)/)?.[1];
      if (minmax) {
        const low = Math.round(parseLocalizedMoney(minmax[1]!));
        const high = Math.round(parseLocalizedMoney(minmax[2]!));
        if (low > 0 && high >= low) {
          return {
            low,
            high,
            currency: "TL",
            damageDeposit: hasar
              ? Math.round(parseLocalizedMoney(hasar))
              : null,
          };
        }
      }
    }
  }

  const range = extractYazlikcimPriceRange(html);
  if (!range) return null;
  return {
    low: range.low,
    high: range.high,
    currency: range.currency,
    damageDeposit: null,
  };
}

function buildMinMaxSeasonPeriods(
  low: number,
  high: number,
  currency: VillaPeriodCurrency,
  damageDeposit?: number | null
): MappedVillaPricePeriod[] {
  const mid = Math.round((low + high) / 2);
  const tierPrice: Record<"low" | "mid" | "high", number> = {
    low,
    mid,
    high,
  };
  const monthTier = (month: number): "low" | "mid" | "high" => {
    if (month === 7 || month === 8) return "high";
    if (month >= 5 && month <= 10) return "mid";
    return "low";
  };

  const nowYear = new Date().getFullYear();
  const periods: MappedVillaPricePeriod[] = [];
  let sourceId = 1;

  for (const year of [nowYear, nowYear + 1]) {
    let runTier: "low" | "mid" | "high" | null = null;
    let runStartMonth = 1;

    const flushRun = (endMonth: number) => {
      if (!runTier) return;
      periods.push(
        buildMappedPeriod({
          sourceId: sourceId++,
          startDate: startOfDay(new Date(year, runStartMonth - 1, 1)),
          endDate: lastDayOfMonth(year, endMonth),
          nightlyPrice: tierPrice[runTier],
          currency,
          damageDeposit: damageDeposit ?? null,
          damageDepositCurrency: currency,
        })
      );
      runTier = null;
    };

    for (let month = 1; month <= 12; month++) {
      const tier = monthTier(month);
      if (runTier === tier) continue;
      if (runTier) flushRun(month - 1);
      runTier = tier;
      runStartMonth = month;
    }
    if (runTier) flushRun(12);
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

function scrapeProductDetailRscFromHtml(
  pageUrl: string,
  html: string,
  warnings: string[]
): ScrapedVillaPage | null {
  if (!looksLikeProductDetailRsc(pageUrl, html)) return null;

  const range = extractProductDetailRscPriceRange(html);
  if (!range) return null;

  const periods = buildMinMaxSeasonPeriods(
    range.low,
    range.high,
    range.currency,
    range.damageDeposit
  );
  if (periods.length === 0) return null;

  warnings.push(
    "Ürün detay sayfasında sezon listesi yoktu; min-max fiyattan tahmini periyot oluşturuldu"
  );
  warnings.push(
    "Müsaitlik takvimi bu sitede otomatik okunamadı; yalnızca fiyat periyotları aktarıldı"
  );

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "product_detail_rsc",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey: new Map(),
    warnings,
  };
}

function looksLikeHepsivilla(pageUrl: string, html: string): boolean {
  try {
    if (normalizeHost(new URL(pageUrl).hostname).includes("hepsivilla")) {
      return true;
    }
  } catch {
    return false;
  }
  return (
    html.includes('class="pb price_block"') && html.includes("url_ajax_cal")
  );
}

function extractHepsivillaCalendarItemId(html: string): string | null {
  const fromJs = html.match(/\bid_item\s*=\s*(\d+)/)?.[1];
  if (fromJs) return fromJs;
  return (
    html.match(/name=["']pid["'][^>]*value=["'](\d+)["']/i)?.[1] ??
    html.match(/value=["'](\d+)["'][^>]*name=["']pid["']/i)?.[1] ??
    html.match(/name=["']id["'][^>]*value=["'](\d+)["']/i)?.[1] ??
    null
  );
}

function extractHepsivillaCalendarUrl(html: string, pageUrl: string): string {
  const fromJs = html.match(/\burl_ajax_cal\s*=\s*["']([^"']+)["']/)?.[1];
  if (fromJs) {
    return fromJs.startsWith("http")
      ? fromJs
      : `${originFromUrl(pageUrl)}${fromJs.startsWith("/") ? "" : "/"}${fromJs}`;
  }
  return `${originFromUrl(pageUrl)}/ajax/cal.do`;
}

function parseHepsivillaDateRange(raw: string): { start: Date; end: Date } | null {
  const text = decodeHtmlEntities(raw)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(/\s*[-–—~]\s*/);
  if (parts.length !== 2) return null;
  const start = parseTurkishLongDate(parts[0]!);
  const end = parseTurkishLongDate(parts[1]!);
  if (!start || !end || compareDates(start, end) > 0) return null;
  return { start, end };
}

/** hepsivilla.com — `.pb.price_block` (data-day1 / data-week1 + ty tarih aralığı). */
export function parseHepsivillaPriceBlocks(
  html: string,
  damageDeposit?: { amount: number | null; currency: VillaPeriodCurrency }
): MappedVillaPricePeriod[] {
  const periods: MappedVillaPricePeriod[] = [];
  const blockRe =
    /<div class="pb price_block"([^>]*)>[\s\S]*?<span class="ty">([\s\S]*?)<\/span>[\s\S]*?<span class="tv">([\s\S]*?)<\/span>/gi;
  let match: RegExpExecArray | null;
  let sourceId = 1;

  while ((match = blockRe.exec(html)) !== null) {
    const attrs = match[1] ?? "";
    const rangeText = stripTags(match[2] ?? "");
    const range = parseHepsivillaDateRange(rangeText);
    if (!range) continue;

    const nightlyRaw =
      attrs.match(/data-day1=["']([^"']+)["']/i)?.[1] ??
      stripTags(match[3] ?? "");
    const weeklyRaw = attrs.match(/data-week1=["']([^"']+)["']/i)?.[1];
    const nightlyParsed = parseMoneyWithCurrency(nightlyRaw);
    const weeklyParsed = weeklyRaw
      ? parseMoneyWithCurrency(weeklyRaw)
      : { amount: null, currency: nightlyParsed.currency };

    if (!nightlyParsed.amount || nightlyParsed.amount <= 0) continue;

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate: range.start,
        endDate: range.end,
        nightlyPrice: nightlyParsed.amount,
        currency: nightlyParsed.currency,
        weeklyPrice: weeklyParsed.amount,
        damageDeposit: damageDeposit?.amount ?? null,
        damageDepositCurrency:
          damageDeposit?.currency ?? nightlyParsed.currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

/** hepsivilla.com `/ajax/cal.do` HTML — `booked` / `onhold` sınıfları. */
export function parseHepsivillaCalendarOccupancy(
  html: string
): Map<string, VillaDayOccupancy> {
  const occupancy = new Map<string, VillaDayOccupancy>();
  const liRe = /<li\b([^>]*)\bid=["'](\d{4}-\d{2}-\d{2})["']([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = liRe.exec(html)) !== null) {
    const attrs = `${match[1] ?? ""} ${match[3] ?? ""}`;
    const key = match[2]!;
    const classMatch = attrs.match(/\bclass=["']([^"']+)["']/i)?.[1] ?? "";
    const classes = classMatch.split(/\s+/).filter(Boolean);

    const isFullBooked = classes.some(
      (c) => c === "booked" || c === "bg_redish"
    );
    const isFullOption = classes.some(
      (c) =>
        c === "onhold" ||
        c === "bg_dark_yellow" ||
        c === "booked_pr"
    );
    const isPartial = classes.some((c) =>
      /^(booked_am|booked_pm|onhold_am|onhold_pm)$/.test(c)
    );

    if (isPartial && !isFullBooked && !isFullOption) continue;

    if (isFullBooked) {
      occupancy.set(key, "BOOKED");
    } else if (isFullOption) {
      if (!occupancy.has(key) || occupancy.get(key) !== "BOOKED") {
        occupancy.set(key, "OPTION");
      }
    }
  }

  return occupancy;
}

async function fetchHepsivillaCalendarOccupancy(
  pageUrl: string,
  html: string,
  itemId: string,
  warnings: string[]
): Promise<Map<string, VillaDayOccupancy>> {
  const calBase = extractHepsivillaCalendarUrl(html, pageUrl);
  const occupancy = new Map<string, VillaDayOccupancy>();
  const today = startOfDay(new Date());
  let year = today.getFullYear();
  let month = today.getMonth() + 1;

  for (let i = 0; i < 24; i++) {
    if (i > 0) await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
    const url = `${calBase}?id_item=${encodeURIComponent(itemId)}&month=${month}&year=${year}&lang=tr&t=${Date.now()}`;
    try {
      const calHtml = await fetchText(url, { referer: pageUrl });
      for (const [key, value] of parseHepsivillaCalendarOccupancy(calHtml)) {
        const existing = occupancy.get(key);
        if (value === "BOOKED" || existing !== "BOOKED") {
          occupancy.set(key, value);
        }
      }
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Hepsivilla takvim ${year}-${String(month).padStart(2, "0")} alınamadı: ${error.message}`
          : `Hepsivilla takvim ${year}-${String(month).padStart(2, "0")} alınamadı`
      );
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return occupancy;
}

async function scrapeHepsivillaFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  if (!looksLikeHepsivilla(pageUrl, html)) return null;

  const deposit = extractDamageDeposit(html);
  const periods = parseHepsivillaPriceBlocks(html, deposit);
  const itemId = extractHepsivillaCalendarItemId(html);
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();

  if (itemId) {
    await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
    for (const [key, value] of await fetchHepsivillaCalendarOccupancy(
      pageUrl,
      html,
      itemId,
      warnings
    )) {
      occupancyByDateKey.set(key, value);
    }
  } else {
    warnings.push("Hepsivilla takvim id_item bulunamadı");
  }

  if (periods.length === 0) {
    if (occupancyByDateKey.size > 0) {
      warnings.push("Hepsivilla takvim okundu ancak price_block bulunamadı");
    }
    return null;
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Hepsivilla fiyatları alındı; müsaitlik takvimi okunamadı veya boş"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "hepsivilla",
    pageTitle: extractPageTitle(html),
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

function looksLikeTatilvillamda(pageUrl: string, html: string): boolean {
  const host = normalizeHost(new URL(pageUrl).hostname);
  if (host.includes("tatilvillamda")) return true;
  return html.includes("fiyat_yazilan_tarihler");
}

function extractEmbeddedJsArray(html: string, varName: string): unknown | null {
  const marker = new RegExp(`(?:var\\s+)?${varName}\\s*=\\s*\\[`);
  const match = marker.exec(html);
  if (!match || match.index == null) return null;

  const start = match.index + match[0].length - 1;
  let depth = 0;
  for (let index = start; index < html.length; index++) {
    const char = html[index];
    if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) {
        const expr = html.slice(start, index + 1);
        try {
          return Function(`"use strict"; return ${expr}`)();
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractTatilvillamdaMinStayNights(html: string): number | null {
  const text = stripTags(html);
  const match = text.match(/minimum\s*kiralama\s*:?\s*(\d+)\s*gece/i);
  return match ? positiveInt(Number(match[1])) : null;
}

export function parseTatilvillamdaPeriods(
  html: string
): MappedVillaPricePeriod[] {
  const rows = extractEmbeddedJsArray(html, "fiyat_yazilan_tarihler");
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const deposit = extractDamageDeposit(html);
  const defaultMinStay = extractTatilvillamdaMinStayNights(html);
  const periods: MappedVillaPricePeriod[] = [];
  const seen = new Set<string>();
  let sourceId = 1;

  for (const raw of rows) {
    if (!Array.isArray(raw) || raw.length < 3) continue;
    const startKey = normalizeLooseDateKey(String(raw[0] ?? ""));
    const endKey = normalizeLooseDateKey(String(raw[1] ?? ""));
    if (!startKey || !endKey) continue;
    const startDate = parseDateKey(startKey);
    const endDate = parseDateKey(endKey);
    if (!startDate || !endDate || compareDates(startDate, endDate) > 0) continue;

    const nightlyPrice = parseTurkishMoneyAmount(String(raw[2] ?? ""));
    if (!nightlyPrice || nightlyPrice <= 0) continue;

    const rowMinStay = positiveInt(Number(String(raw[3] ?? "").trim()));
    const minStayNights = rowMinStay ?? defaultMinStay;
    const dedupeKey = `${startKey}_${endKey}_${nightlyPrice}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate,
        endDate,
        nightlyPrice,
        currency: mapCurrencyCode(String(raw[2] ?? "")),
        minStayNights,
        damageDeposit: deposit.amount,
        damageDepositCurrency: deposit.currency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

export function parseTatilvillamdaOccupancy(
  html: string
): Map<string, VillaDayOccupancy> {
  const occupancy = new Map<string, VillaDayOccupancy>();
  const dolu = extractEmbeddedJsArray(html, "dolutarihler");
  if (!Array.isArray(dolu)) return occupancy;

  for (const raw of dolu) {
    const key = normalizeLooseDateKey(String(raw ?? ""));
    if (!key) continue;
    occupancy.set(key, "BOOKED");
  }

  return occupancy;
}

export function scrapeTatilvillamdaFromHtml(
  pageUrl: string,
  html: string,
  warnings: string[]
): ScrapedVillaPage | null {
  if (!looksLikeTatilvillamda(pageUrl, html)) return null;

  const periods = parseTatilvillamdaPeriods(html);
  const occupancyByDateKey = parseTatilvillamdaOccupancy(html);

  if (periods.length === 0) {
    if (occupancyByDateKey.size > 0) {
      warnings.push(
        "Tatilvillamda takvimi okundu ancak fiyat_yazilan_tarihler bulunamadı"
      );
    }
    return null;
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Tatilvillamda fiyatları alındı; dolutarihler takvimi boş"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "tatilvillamda",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

function extractWindowJsValue(html: string, varName: string): unknown | null {
  const marker = `window.${varName}`;
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const eq = html.indexOf("=", idx + marker.length);
  if (eq < 0) return null;
  let pos = eq + 1;
  while (pos < html.length && /\s/.test(html[pos]!)) pos++;
  return parseJsonValueAt(html, pos);
}

type LuxuryvillamDay = {
  price?: number;
  min_night?: number;
  cleaning_price?: number;
  min_cleaning?: number;
  status?: string;
};

function looksLikeLuxuryvillam(pageUrl: string, html: string): boolean {
  try {
    const host = normalizeHost(new URL(pageUrl).hostname);
    if (host.includes("luxuryvillam")) return true;
  } catch {
    return false;
  }
  return html.includes("window.VILLA_CALENDAR");
}

export function scrapeLuxuryvillamFromHtml(
  pageUrl: string,
  html: string,
  warnings: string[]
): ScrapedVillaPage | null {
  if (!looksLikeLuxuryvillam(pageUrl, html)) return null;

  const calendarRaw = extractWindowJsValue(html, "VILLA_CALENDAR");
  if (!calendarRaw || typeof calendarRaw !== "object") return null;

  const manualFull = extractWindowJsValue(html, "VILLA_MANUAL_FULL_DATES");
  const prepaymentMatch = html.match(/window\.VILLA_PREPAYMENT\s*=\s*(\d+)/);
  const prepaymentRate = prepaymentMatch
    ? positiveInt(Number(prepaymentMatch[1]))
    : null;
  const deposit = extractDamageDeposit(html);
  const occupancyByDateKey = new Map<string, VillaDayOccupancy>();

  if (Array.isArray(manualFull)) {
    for (const raw of manualFull) {
      const key = normalizeLooseDateKey(String(raw ?? ""));
      if (key) occupancyByDateKey.set(key, "BOOKED");
    }
  }

  const dayMeta = new Map<string, LuxuryvillamDay>();
  const dateKeys: string[] = [];
  const prices: number[] = [];

  for (const [rawDate, rawDay] of Object.entries(
    calendarRaw as Record<string, unknown>
  )) {
    const key = normalizeLooseDateKey(rawDate);
    if (!key) continue;
    const day =
      rawDay && typeof rawDay === "object"
        ? (rawDay as LuxuryvillamDay)
        : ({} as LuxuryvillamDay);
    const price = Number(day.price);
    if (!Number.isFinite(price) || price <= 0) continue;

    dayMeta.set(key, day);
    dateKeys.push(key);
    prices.push(price);

    const status = String(day.status ?? "").toLowerCase();
    if (status === "full" || status === "booked" || status === "dolu") {
      occupancyByDateKey.set(key, "BOOKED");
    }
  }

  if (dateKeys.length === 0) return null;

  const periods = collapseDailyPricesToPeriods(dateKeys, prices, "TL").map(
    (period) => {
      const startKey = toDateKey(period.startDate);
      const meta = dayMeta.get(startKey);
      return {
        ...period,
        minStayNights: positiveInt(Number(meta?.min_night)) ?? period.minStayNights,
        prepaymentRate,
        cleaningFee: positiveInt(Number(meta?.cleaning_price)) ?? period.cleaningFee,
        cleaningFeeCurrency: "TL" as VillaPeriodCurrency,
        cleaningDayCount:
          positiveInt(Number(meta?.min_cleaning)) ?? period.cleaningDayCount,
        damageDeposit: deposit.amount ?? period.damageDeposit,
        damageDepositCurrency: deposit.currency,
      };
    }
  );

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      "Luxuryvillam fiyatları alındı; dolu gün listesi boş (tüm günler müsait kabul edildi)"
    );
  }

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy: "luxuryvillam",
    pageTitle: extractPageTitle(html),
    periods,
    occupancyByDateKey,
    warnings,
  };
}

function looksLikeKaskavillaPanelFamily(pageUrl: string, html?: string): {
  host: string;
  apiBase: string;
} | null {
  try {
    const host = normalizeHost(new URL(pageUrl).hostname);
    if (host.includes("kaskavilla")) {
      return { host, apiBase: "https://panel.kaskavilla.com" };
    }
    if (host.includes("villaevreni")) {
      return { host, apiBase: "https://panel.villaevreni.com" };
    }
    if (html?.includes("panel.villaevreni.com")) {
      return { host: "villaevreni.com", apiBase: "https://panel.villaevreni.com" };
    }
    return null;
  } catch {
    return null;
  }
}

function looksLikeKaskavilla(pageUrl: string): boolean {
  return looksLikeKaskavillaPanelFamily(pageUrl) != null;
}

function parseKaskavillaDmyDate(raw: string): Date | null {
  const key = normalizeLooseDateKey(raw.trim());
  return key ? parseDateKey(key) : null;
}

type KaskavillaPriceSets = {
  prepaymentRate: number | null;
  commissionRate: number | null;
  cleaningFee: number | null;
  cleaningFeeCurrency: VillaPeriodCurrency;
  damageDeposit: number | null;
  damageDepositCurrency: VillaPeriodCurrency;
  minStayNights: number | null;
};

function parseKaskavillaPriceSets(raw: unknown): KaskavillaPriceSets {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const currency = mapCurrencyCode(String(o.vil_currency ?? "TL"));
  return {
    prepaymentRate: positiveInt(Number(o.vil_kaparo)),
    commissionRate: positiveInt(Number(o.vil_komisyon)),
    cleaningFee: positiveInt(Number(o.vil_extra_tem)),
    cleaningFeeCurrency: currency,
    damageDeposit: positiveInt(Number(o.vil_depozito)),
    damageDepositCurrency: currency,
    minStayNights: positiveInt(Number(o.vil_enaz)),
  };
}

export function parseKaskavillaPriceTable(
  priceTable: unknown,
  priceSets: KaskavillaPriceSets
): MappedVillaPricePeriod[] {
  if (!Array.isArray(priceTable) || priceTable.length === 0) return [];

  const periods: MappedVillaPricePeriod[] = [];
  const seen = new Set<string>();
  let sourceId = 1;

  for (const raw of priceTable) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const startDate = parseKaskavillaDmyDate(String(row.fiy_start ?? ""));
    const endDate = parseKaskavillaDmyDate(String(row.fiy_end ?? ""));
    if (!startDate || !endDate || compareDates(startDate, endDate) > 0) continue;

    const priceRaw = row.fiy_fiyat;
    const listedPrice =
      typeof priceRaw === "number"
        ? priceRaw
        : parseTurkishMoneyAmount(String(priceRaw ?? ""));
    if (!listedPrice || listedPrice <= 0) continue;

    const minStayNights =
      positiveInt(Number(row.fiy_enaz)) ?? priceSets.minStayNights;
    const priceType = positiveInt(Number(row.fiy_tur));
    const isWeekly = priceType === 1 || (minStayNights != null && minStayNights >= 7);
    const weeklyPrice = isWeekly ? listedPrice : null;
    const nightlyPrice = isWeekly
      ? deriveNightlyFromWeekly(listedPrice)
      : listedPrice;
    if (!nightlyPrice || nightlyPrice <= 0) continue;

    const dedupeKey = `${toDateKey(startDate)}_${toDateKey(endDate)}_${nightlyPrice}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    periods.push(
      buildMappedPeriod({
        sourceId: sourceId++,
        startDate,
        endDate,
        nightlyPrice,
        weeklyPrice,
        currency: priceSets.damageDepositCurrency,
        minStayNights,
        prepaymentRate: priceSets.prepaymentRate,
        commissionRate: priceSets.commissionRate,
        cleaningFee: priceSets.cleaningFee,
        cleaningFeeCurrency: priceSets.cleaningFeeCurrency,
        damageDeposit: priceSets.damageDeposit,
        damageDepositCurrency: priceSets.damageDepositCurrency,
      })
    );
  }

  return periods.sort((a, b) => compareDates(a.startDate, b.startDate));
}

function addKaskavillaOccupancyDates(
  occupancy: Map<string, VillaDayOccupancy>,
  dates: unknown,
  status: VillaDayOccupancy
) {
  if (!Array.isArray(dates)) return;
  for (const raw of dates) {
    const key = normalizeLooseDateKey(String(raw ?? ""));
    if (!key) continue;
    if (status === "BOOKED") {
      occupancy.set(key, "BOOKED");
      continue;
    }
    if (!occupancy.has(key) || occupancy.get(key) !== "BOOKED") {
      occupancy.set(key, status);
    }
  }
}

export function parseKaskavillaOccupancyFromPeriyotlar(
  payload: unknown
): Map<string, VillaDayOccupancy> {
  const occupancy = new Map<string, VillaDayOccupancy>();
  if (!payload || typeof payload !== "object") return occupancy;

  const o = payload as Record<string, unknown>;
  addKaskavillaOccupancyDates(occupancy, o.kapali, "BOOKED");
  addKaskavillaOccupancyDates(occupancy, o.kapaliGiris, "BOOKED");
  addKaskavillaOccupancyDates(occupancy, o.ortakKapali, "BOOKED");
  addKaskavillaOccupancyDates(occupancy, o.opsiyon, "OPTION");
  addKaskavillaOccupancyDates(occupancy, o.opsiyonGiris, "OPTION");
  addKaskavillaOccupancyDates(occupancy, o.ortakOpsiyon, "OPTION");

  return occupancy;
}

export async function scrapeKaskavillaFromPage(
  pageUrl: string,
  html: string,
  warnings: string[]
): Promise<ScrapedVillaPage | null> {
  const family = looksLikeKaskavillaPanelFamily(pageUrl, html);
  if (!family) return null;

  const nuxt = parseNuxtPayload(html);
  if (!nuxt || typeof nuxt !== "object") {
    warnings.push(`${family.host} window.__NUXT__ okunamadı`);
    return null;
  }

  const data0 = (nuxt as { data?: unknown[] }).data?.[0];
  if (!data0 || typeof data0 !== "object") {
    warnings.push(`${family.host} __NUXT__ data[0] yok`);
    return null;
  }

  const vil = (data0 as { vil?: unknown }).vil;
  if (!vil || typeof vil !== "object") {
    warnings.push(`${family.host} __NUXT__ vil yok`);
    return null;
  }

  const villa = vil as Record<string, unknown>;
  const vilId = positiveInt(Number(villa.id));
  const priceSets = parseKaskavillaPriceSets(villa.price_sets ?? villa.priceSets);
  const priceTable = villa.priceTable ?? villa.price;
  const periods = parseKaskavillaPriceTable(priceTable, priceSets);

  let occupancyByDateKey = new Map<string, VillaDayOccupancy>();
  if (vilId) {
    try {
      await sleep(EXTERNAL_PAGE_SCRAPE_DELAY_MS);
      const payload = await fetchJson(
        `${family.apiBase}/frontapi/periyotlar/${vilId}`,
        { referer: pageUrl }
      );
      occupancyByDateKey = parseKaskavillaOccupancyFromPeriyotlar(payload);
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `${family.host} takvim API hatası: ${error.message}`
          : `${family.host} takvim API hatası`
      );
    }
  } else {
    warnings.push(`${family.host} villa id bulunamadı; takvim atlandı`);
  }

  if (periods.length === 0) {
    if (occupancyByDateKey.size > 0) {
      warnings.push(
        `${family.host} takvimi okundu ancak priceTable bulunamadı`
      );
    }
    return null;
  }

  if (occupancyByDateKey.size === 0) {
    warnings.push(
      `${family.host} fiyatları alındı; müsaitlik takvimi boş veya okunamadı`
    );
  }

  const title =
    typeof villa.vil_adi === "string" ? villa.vil_adi.trim() : null;

  const strategy: ScrapedVillaPage["strategy"] = family.host.includes(
    "villaevreni"
  )
    ? "villaevreni"
    : "kaskavilla";

  return {
    sourceHost: normalizeHost(new URL(pageUrl).hostname),
    strategy,
    pageTitle: title || extractPageTitle(html),
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
  if (heryer) return finalizeScrapedPage(heryer, html);

  const tatilvillamda = scrapeTatilvillamdaFromHtml(
    parsed.toString(),
    html,
    warnings
  );
  if (tatilvillamda) return finalizeScrapedPage(tatilvillamda, html);

  const luxuryvillam = scrapeLuxuryvillamFromHtml(
    parsed.toString(),
    html,
    warnings
  );
  if (luxuryvillam) return finalizeScrapedPage(luxuryvillam, html);

  const yazlikvillaci = await scrapeYazlikvillaciFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (yazlikvillaci) return finalizeScrapedPage(yazlikvillaci, html);

  const villavillam = await scrapeVillavillamFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (villavillam) return finalizeScrapedPage(villavillam, html);

  const tatilvillasi = await scrapeTatilvillasiFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (tatilvillasi) return finalizeScrapedPage(tatilvillasi, html);

  const akdenizvillam = scrapeAkdenizvillamFromHtml(
    parsed.toString(),
    html,
    warnings
  );
  if (akdenizvillam) return finalizeScrapedPage(akdenizvillam, html);

  const villavakti = scrapeVillavaktiFromHtml(
    parsed.toString(),
    html,
    warnings
  );
  if (villavakti) return finalizeScrapedPage(villavakti, html);

  const productDetailRsc = scrapeProductDetailRscFromHtml(
    parsed.toString(),
    html,
    warnings
  );
  if (productDetailRsc) return finalizeScrapedPage(productDetailRsc, html);

  const hepsivilla = await scrapeHepsivillaFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (hepsivilla) return finalizeScrapedPage(hepsivilla, html);

  const villakalkan = scrapeVillakalkanFromHtml(
    parsed.toString(),
    html,
    warnings
  );
  if (villakalkan) return finalizeScrapedPage(villakalkan, html);

  const kaskavilla = await scrapeKaskavillaFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (kaskavilla) return finalizeScrapedPage(kaskavilla, html);

  const kvt = await scrapeKvtFromPage(parsed.toString(), html, warnings);
  if (kvt) return finalizeScrapedPage(kvt, html);

  const villasayfam = await scrapeVillasayfamFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (villasayfam) return finalizeScrapedPage(villasayfam, html);

  const tatilkentim = await scrapeTatilkentimFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (tatilkentim) return finalizeScrapedPage(tatilkentim, html);

  const villaoteltatili = await scrapeVillaoteltatiliFromPage(
    parsed.toString(),
    html,
    warnings
  );
  if (villaoteltatili) return finalizeScrapedPage(villaoteltatili, html);

  const bocek = await scrapeBoceksoft(parsed.toString(), html, warnings);
  if (bocek) return finalizeScrapedPage(bocek, html);

  const next = parseNextDataPeriodsAndOccupancy(html);
  if (next && next.periods.length > 0) {
    return finalizeScrapedPage(
      {
      sourceHost: normalizeHost(parsed.hostname),
      strategy: "next_data",
      pageTitle: extractPageTitle(html),
      periods: next.periods,
      occupancyByDateKey: next.occupancyByDateKey,
      warnings,
      },
      html
    );
  }

  const generic = parseGenericHtmlPeriods(html);
  if (generic.length > 0) {
    if (!next || next.occupancyByDateKey.size === 0) {
      warnings.push(
        "Müsaitlik takvimi bu sitede otomatik okunamadı; yalnızca fiyat periyotları aktarıldı"
      );
    }
    return finalizeScrapedPage(
      {
      sourceHost: normalizeHost(parsed.hostname),
      strategy: "html_periods",
      pageTitle: extractPageTitle(html),
      periods: generic,
      occupancyByDateKey: next?.occupancyByDateKey ?? new Map(),
      warnings,
      },
      html
    );
  }

  throw new Error(
    "Bu villa sayfasından fiyat/takvim okunamadı. Desteklenen örnekler: heryervillam.com, hepsivilla.com, tatilvillamda.com, luxuryvillam.com, kaskavilla.com, villaevreni.com, tatilvillasi.com.tr, villavillam.com.tr, villacim.com.tr, tatilpremium.com, akdenizvillam.com, villavakti.com, villaciniz.com.tr, villapaketi.com, villayolu.com, mustakilvillam.com, myvillacity.com, villakilavuzu.com, villakalkan.com.tr, yazlikvillaci.com.tr, yazlikcim.com.tr, risusvillatatili.com, tatilkentim.com, villasayfam.com, villaoteltatili.com, kiralikvilladatatil.com / dalvillalari.com (Boceksoft), __NEXT_DATA__ periyot içeren Next.js siteleri, veya HTML dönem fiyat tablosu."
  );
}
