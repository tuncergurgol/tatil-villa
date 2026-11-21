import {
  EXCHANGE_RATE_MARGIN,
  type PublicExchangeRates,
} from "@/lib/currency-conversion";

const TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";
const GARANTI_URL =
  "https://customers.garantibbva.com.tr/digital-public/currency-convertor-public/v2/currency-convertor/currency-list-detail";
const FETCH_TIMEOUT_MS = 8_000;
const MEMORY_CACHE_MS = 15 * 60 * 1_000;

let lastKnownRates: PublicExchangeRates | null = null;
let lastKnownFetchedAt = 0;

function validRate(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function withMargin(value: number): number {
  return value * EXCHANGE_RATE_MARGIN;
}

function parseTcmbCurrency(xml: string, currency: "EUR" | "USD" | "GBP") {
  const block = xml.match(
    new RegExp(
      `<Currency[^>]+CurrencyCode=["']${currency}["'][^>]*>([\\s\\S]*?)<\\/Currency>`,
      "i"
    )
  )?.[1];
  const raw = block?.match(/<ForexSelling>([^<]+)<\/ForexSelling>/i)?.[1];
  const rate = Number(String(raw ?? "").replace(",", "."));
  if (!validRate(rate)) {
    throw new Error(`TCMB ${currency} döviz satış kuru bulunamadı.`);
  }
  return rate;
}

async function fetchTcmbRates(): Promise<PublicExchangeRates> {
  const response = await fetch(TCMB_URL, {
    headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
    next: { revalidate: 60 * 60 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`TCMB kur servisi HTTP ${response.status}`);
  }

  const xml = await response.text();
  const dateLabel =
    xml.match(/<Tarih_Date[^>]+Date=["']([^"']+)["']/i)?.[1] ??
    new Date().toISOString();

  return {
    TL: 1,
    EUR: withMargin(parseTcmbCurrency(xml, "EUR")),
    USD: withMargin(parseTcmbCurrency(xml, "USD")),
    GBP: withMargin(parseTcmbCurrency(xml, "GBP")),
    source: "TCMB",
    publishedAt: dateLabel,
  };
}

type GarantiRateRow = {
  currCode?: string;
  exchSellRate?: number;
  currDate?: string;
  currTime?: string;
};

async function fetchGarantiRates(): Promise<PublicExchangeRates> {
  const response = await fetch(GARANTI_URL, {
    headers: {
      Accept: "application/json",
      Origin: "https://webforms.garantibbva.com.tr",
      Referer: "https://webforms.garantibbva.com.tr/",
      channel: "Internet",
      "client-id": "DslahJXaDW59ibNZppCm",
      "client-session-id": crypto.randomUUID(),
      "client-type": "ArkClient",
      dialect: "TR",
      guid: crypto.randomUUID().replaceAll("-", ""),
      ip: "127.0.0.1",
      "tenant-company-id": "GAR",
      "tenant-geolocation": "TUR",
    },
    next: { revalidate: 15 * 60 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Garanti BBVA kur servisi HTTP ${response.status}`);
  }

  const rows = (await response.json()) as GarantiRateRow[];
  const findSelling = (currency: "EUR" | "USD" | "GBP") => {
    const row = rows.find((item) => item.currCode === `${currency}/TL`);
    const rate = Number(row?.exchSellRate);
    if (!row || !validRate(rate)) {
      throw new Error(`Garanti BBVA ${currency} satış kuru bulunamadı.`);
    }
    return { rate, row };
  };

  const eur = findSelling("EUR");
  const usd = findSelling("USD");
  const gbp = findSelling("GBP");
  const publishedAt = [usd.row.currDate, usd.row.currTime]
    .filter(Boolean)
    .join(" ");

  return {
    TL: 1,
    EUR: withMargin(eur.rate),
    USD: withMargin(usd.rate),
    GBP: withMargin(gbp.rate),
    source: "GARANTI_BBVA",
    publishedAt: publishedAt || new Date().toISOString(),
  };
}

/**
 * Öncelik TCMB döviz satış kuru; erişilemez/geçersizse Garanti BBVA satış kuru.
 * İki kaynak da geçici olarak kapalıysa aynı process içindeki son başarılı kur
 * kullanılır; hiç başarılı kur yoksa fiyat üretmek yerine hata verir.
 */
export async function getPublicExchangeRates(): Promise<PublicExchangeRates> {
  if (
    lastKnownRates &&
    Date.now() - lastKnownFetchedAt < MEMORY_CACHE_MS
  ) {
    return lastKnownRates;
  }

  try {
    const rates = await fetchTcmbRates();
    lastKnownRates = rates;
    lastKnownFetchedAt = Date.now();
    return rates;
  } catch (tcmbError) {
    console.warn("TCMB döviz kuru alınamadı, Garanti BBVA deneniyor.", tcmbError);
  }

  try {
    const rates = await fetchGarantiRates();
    lastKnownRates = rates;
    lastKnownFetchedAt = Date.now();
    return rates;
  } catch (garantiError) {
    console.error("Garanti BBVA döviz kuru da alınamadı.", garantiError);
  }

  if (lastKnownRates) return lastKnownRates;
  throw new Error("Güncel döviz satış kurları alınamadı.");
}
