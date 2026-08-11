import {
  buildOtelzAffiliateUrl,
  OTELZ_BASE_URL,
  type OtelzAffiliateParams,
} from "@/lib/otelz";

export type OtelzPlaceSuggestion = {
  id: number;
  liveId: number;
  code: string;
  name: string;
  nameEn: string;
  parentName: string | null;
  type: number;
  subType: number;
  group: number;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  imagePath: string | null;
  isHotel: boolean;
  label: string;
  subtitle: string | null;
};

type RawOtelzSuggestion = {
  id?: number;
  liveId?: number;
  code?: string;
  name?: string;
  nameEn?: string;
  parentName?: string | null;
  parentNameEn?: string | null;
  type?: number;
  subType?: number;
  group?: number;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  img?: string | null;
};

const OTELZ_SUGGESTIONS_URL =
  "https://www.otelz.com/api/v1/searches/suggestions";

export function isOtelzHotelSuggestion(place: Pick<OtelzPlaceSuggestion, "type" | "group">) {
  // Otelz: group 6 = tesis; type 6xx aralığı otel/termal vb.
  return place.group === 6 || place.type >= 600;
}

export function mapOtelzPlaceSuggestion(raw: RawOtelzSuggestion): OtelzPlaceSuggestion | null {
  const code = raw.code?.trim();
  const name = raw.name?.trim();
  if (!code || !name) return null;

  const type = Number(raw.type ?? 0);
  const group = Number(raw.group ?? 0);
  const isHotel = group === 6 || type >= 600;
  const parentName = raw.parentName?.trim() || null;

  return {
    id: Number(raw.id ?? raw.liveId ?? 0),
    liveId: Number(raw.liveId ?? raw.id ?? 0),
    code,
    name,
    nameEn: raw.nameEn?.trim() || name,
    parentName,
    type,
    subType: Number(raw.subType ?? 0),
    group,
    countryCode: raw.countryCode?.trim() || "TR",
    latitude: Number.isFinite(raw.latitude) ? Number(raw.latitude) : null,
    longitude: Number.isFinite(raw.longitude) ? Number(raw.longitude) : null,
    imagePath: raw.img?.trim() || null,
    isHotel,
    label: name,
    subtitle: isHotel ? parentName : parentName,
  };
}

export async function fetchOtelzPlaceSuggestions(
  term: string
): Promise<OtelzPlaceSuggestion[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const url = new URL(OTELZ_SUGGESTIONS_URL);
  url.searchParams.set("isMobileDevice", "false");
  url.searchParams.set("term", query);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; TatildeyizOtelz/1.0)",
      Referer: `${OTELZ_BASE_URL}/`,
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Otelz öneri isteği başarısız (${response.status})`);
  }

  const payload = (await response.json()) as RawOtelzSuggestion[];
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item) => mapOtelzPlaceSuggestion(item))
    .filter((item): item is OtelzPlaceSuggestion => item != null);
}

export function buildOtelzPlacePath(place: OtelzPlaceSuggestion): string {
  if (isOtelzHotelSuggestion(place)) {
    return `/hotel/${place.code}`;
  }
  return `/${place.code}-otelleri`;
}

export function buildOtelzPlaceSearchUrl(input: {
  place?: OtelzPlaceSuggestion | null;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  affiliate?: OtelzAffiliateParams;
}): string {
  const affiliate = input.affiliate;
  const path = input.place ? buildOtelzPlacePath(input.place) : "/oteller";
  const url = new URL(path, OTELZ_BASE_URL);

  if (!input.place) {
    const destination = input.destination?.trim();
    if (destination) {
      url.searchParams.set("q", destination);
    }
  }

  if (input.checkIn?.trim()) {
    url.searchParams.set("checkIn", input.checkIn.trim());
    url.searchParams.set("checkin", input.checkIn.trim());
  }
  if (input.checkOut?.trim()) {
    url.searchParams.set("checkOut", input.checkOut.trim());
    url.searchParams.set("checkout", input.checkOut.trim());
  }
  if (input.guests != null && input.guests > 0) {
    url.searchParams.set("guests", String(input.guests));
  }

  const affiliateUrl = buildOtelzAffiliateUrl(
    `${url.pathname}${url.search}`,
    affiliate
  );
  return affiliateUrl;
}
