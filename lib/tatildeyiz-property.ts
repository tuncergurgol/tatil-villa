import { sleep } from "@/lib/tatildeyiz-gallery";

const TATILDEYIZ_BASE_URL = "https://www.tatildeyiz.com.tr";
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; TatilVillaImport/1.0)",
  Accept: "text/html,application/xhtml+xml",
};

export type TatildeyizCurrency = {
  id: number;
  label: string;
  value: string;
};

export type TatildeyizPropertyPeriodPrice = {
  id: number;
  propertyId: number;
  periodName: string | null;
  periodStart: string;
  periodEnd: string;
  price: number;
  weekendPrice: number | null;
  weekendDays: number[];
  weekendMinimumStay: number | null;
  currencyId: number;
  cleaningFee: number | null;
  ekYatakUcreti: number | null;
  hasarDepozitosu: number | null;
  odaKahvaltiUcreti: number | null;
  tamPansiyonUcreti: number | null;
  yarimPansiyonUcreti: number | null;
  komisyonOrani: number | null;
  onOdemeOrani: number | null;
  minimumKonaklamaSuresi: number | null;
  temizlikGunSayisi: number | null;
  yerdenIsitmaBedeli: number | null;
  evcilHayvanHasarDepozitosu: number | null;
  evcilHayvanTemizlikBedeli: number | null;
  cocuk02YasUcreti: number | null;
  cocuk03_09YasUcreti: number | null;
  cleaningFeeCurrencyId: number | null;
  hasarDepozitosuCurrencyId: number | null;
  ekYatakUcretiCurrencyId: number | null;
  yerdenIsitmaBedeliCurrencyId: number | null;
  evcilHayvanHasarDepozitosuCurrencyId: number | null;
  evcilHayvanTemizlikBedeliCurrencyId: number | null;
  cocuk02YasUcretiCurrencyId: number | null;
  cocuk03_09YasUcretiCurrencyId: number | null;
  currency: TatildeyizCurrency | null;
};

export type TatildeyizPropertyDiscount = {
  id: number;
  propertyId: number;
  propertyPeriodPriceId?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  discount1Rate?: number | null;
  discount2Rate?: number | null;
  extraDiscountAmount?: number | null;
  indirim1Orani?: number | null;
  indirim2Orani?: number | null;
  indirimTutari?: number | null;
};

export type TatildeyizPropertyBooking = {
  id: number;
  checkIn: string;
  checkOut: string;
  statusId: number;
};

export type TatildeyizProperty = {
  id: number;
  slug: string;
  title: string;
  propertyPeriodPrices: TatildeyizPropertyPeriodPrice[];
  propertyDiscounts: TatildeyizPropertyDiscount[];
  bookings: TatildeyizPropertyBooking[];
};

export function getTatildeyizPropertyPageUrl(slug: string) {
  return `${TATILDEYIZ_BASE_URL}/${slug.replace(/^\/+/, "")}`;
}

export async function fetchTatildeyizProperty(
  slug: string
): Promise<TatildeyizProperty> {
  const response = await fetch(getTatildeyizPropertyPageUrl(slug), {
    headers: FETCH_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status}): ${slug}`);
  }

  const html = await response.text();
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error("__NEXT_DATA__ bulunamadı");
  }

  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf("</script>", jsonStart);
  const data = JSON.parse(html.slice(jsonStart, jsonEnd)) as {
    props?: { pageProps?: { tesis?: TatildeyizProperty } };
  };

  const tesis = data.props?.pageProps?.tesis;
  if (!tesis) {
    throw new Error("Tesis verisi bulunamadı");
  }

  return tesis;
}

export async function fetchTatildeyizPropertyWithDelay(slug: string) {
  await sleep(300);
  return fetchTatildeyizProperty(slug);
}
