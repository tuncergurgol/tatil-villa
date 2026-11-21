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

export type TatildeyizRoomType = {
  id: number;
  name: string;
};

export type TatildeyizRoomAmenity = {
  id: number;
  name: string;
  icon: string | null;
  isActive: boolean;
  orderNumber: number | null;
};

export type TatildeyizPropertyRoomAmenityLink = {
  id: number;
  propertyRoomId: number;
  roomAmenityId: number;
  roomAmenity: TatildeyizRoomAmenity | null;
};

export type TatildeyizPropertyRoom = {
  id: number;
  propertyId: number;
  singleBed: number;
  doubleBed: number;
  roomTypeId: number;
  roomName: string | null;
  roomImage: string | null;
  roomTypes: TatildeyizRoomType | null;
  roomAmenities: TatildeyizPropertyRoomAmenityLink[];
};

export type TatildeyizPropertyDetail = {
  id: number;
  bedroomInfo: string | null;
  bathroomInfo: string | null;
  kitchenInfo: string | null;
  poolInfo: string | null;
  cleaningInfo: string | null;
  detail: string | null;
  locationInfo: string | null;
};

export type TatildeyizPoolType = {
  id: number;
  name: string;
};

export type TatildeyizPoolWaterTreatment = {
  id: number;
  name: string;
};

export type TatildeyizPropertyPool = {
  id: number;
  width: number | null;
  length: number | null;
  height: number | null;
  unit: string | null;
  heating: boolean | null;
  typeId: number | null;
  propertyId: number;
  treatmentId: number | null;
  conservative_friendly: boolean | null;
  poolType: TatildeyizPoolType | null;
  poolWaterTreatment: TatildeyizPoolWaterTreatment | null;
  poolPeriods?: unknown[];
};

export type TatildeyizLocationCategory = {
  id: number;
  name: string;
  order?: number | null;
};

export type TatildeyizLocationType = {
  id: number;
  name: string;
  locationCategoryId: number;
  locationCategory: TatildeyizLocationCategory | null;
};

export type TatildeyizPropertyLocation = {
  id: number;
  distance: string | null;
  locationTypeId: number;
  propertyId: number;
  locationType: TatildeyizLocationType | null;
};

export type TatildeyizPropertyAddress = {
  id: number;
  address: string | null;
  neighborhoodId: number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  Neighborhood?: {
    id: number;
    title: string;
    districtId: number;
    District?: {
      id: number;
      title: string;
      townId: number;
      Town?: {
        id: number;
        title: string;
        cityId: number;
        City?: {
          id: number;
          title: string;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type TatildeyizProperty = {
  id: number;
  slug: string;
  title: string;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  description: string | null;
  propertyDetail: TatildeyizPropertyDetail | null;
  PropertyRooms: TatildeyizPropertyRoom[];
  pools?: TatildeyizPropertyPool[];
  propertyPeriodPrices: TatildeyizPropertyPeriodPrice[];
  propertyDiscounts: TatildeyizPropertyDiscount[];
  bookings: TatildeyizPropertyBooking[];
  locations?: TatildeyizPropertyLocation[];
  address?: TatildeyizPropertyAddress | null;
  addressId?: number | null;
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
  await sleep(500);
  return fetchTatildeyizProperty(slug);
}
