/**
 * MyVillaCity (TurizmPlus / TanStack Start) villa sayfası.
 * Veri `property:$R[n]={...}` dehydrated payload içindedir; eski routingData API'si yoktur.
 */

export type TurizmplusDistance = {
  name: string;
  distanceKm: number;
  categoryName: string;
};

export type TurizmplusPool = {
  poolType: string;
  heated: boolean;
  conservative: boolean;
};

export type TurizmplusRoomBeds = {
  singleBeds: number;
  doubleBeds: number;
};

export type TurizmplusPeriod = {
  startDate: string;
  endDate: string;
  nightlyRate: number;
  minStay: number | null;
  cleaningFee: number | null;
  /**
   * Temizlik eşiği. Kaynak "6 geceye kadar" ise 7 yazılır:
   * sistem ücreti yalnızca konaklama gecesi bu sayıdan küçükken alır.
   */
  cleaningDayCount: number | null;
};

export type TurizmplusVilla = {
  name: string;
  shortDescription: string;
  longDescription: string;
  locationLabel: string;
  districtName: string | null;
  cityName: string | null;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  documentNo: string;
  checkInTime: string;
  checkOutTime: string;
  currency: "TL" | "EUR" | "USD" | "GBP";
  minNightlyPrice: number | null;
  damageDeposit: number | null;
  prepaymentRate: number | null;
  imageUrls: string[];
  amenityLabels: string[];
  distances: TurizmplusDistance[];
  pool: TurizmplusPool | null;
  rooms: TurizmplusRoomBeds[];
  allowPets: boolean;
  allowEvents: boolean;
  allowSmoking: boolean;
  allowChildren: boolean;
  allowBaby: boolean;
  periods: TurizmplusPeriod[];
};

const POI_CATEGORY: Record<string, string> = {
  supermarket: "Market",
  hospital: "Sağlık",
  pharmacy: "Sağlık",
  airport: "Havalimanı",
  bus_station: "Ulaşım",
  city_center: "Merkez",
  beach: "Plaj",
  marina: "Marina",
  attraction: "Turistik Yer",
  restaurant: "Restoran",
  center: "Merkez",
};

function decodeJsString(raw: string): string {
  return raw
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function jsString(slice: string, key: string): string {
  const match = slice.match(
    new RegExp(`${key}:"((?:\\\\.|[^"\\\\])*)"`)
  );
  return match?.[1] ? decodeJsString(match[1]).trim() : "";
}

function jsNumber(slice: string, key: string): number | null {
  const quoted = slice.match(new RegExp(`${key}:"(-?\\d+(?:\\.\\d+)?)"`));
  const bare = slice.match(new RegExp(`${key}:(-?\\d+(?:\\.\\d+)?)`));
  const raw = quoted?.[1] ?? bare?.[1];
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function currencyFromCode(code: string): TurizmplusVilla["currency"] {
  const normalized = code.trim().toUpperCase();
  if (normalized === "EUR") return "EUR";
  if (normalized === "USD") return "USD";
  if (normalized === "GBP") return "GBP";
  return "TL";
}

function propertySlice(html: string): string | null {
  const match = html.match(/property:\$R\[\d+\]=\{id:"[0-9a-f-]{36}"/);
  if (!match || match.index == null) return null;
  return html.slice(match.index, match.index + 220_000);
}

function between(slice: string, startRe: RegExp, endMarker: string): string {
  const start = slice.search(startRe);
  if (start < 0) return "";
  const end = slice.indexOf(endMarker, start + 1);
  return slice.slice(start, end > start ? end : start + 80_000);
}

function extractImages(slice: string): string[] {
  const chunk = between(slice, /media:\$R\[\d+\]=\[/, "amenities:$R");
  const urls: string[] = [];
  const re = /(?:^|[^A-Za-z])url:"(https:\/\/[^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(chunk)) !== null) {
    const url = match[1]!;
    if (/\/w\d+\.webp(?:$|\?)/i.test(url)) continue;
    if (!/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(url)) continue;
    urls.push(url);
  }
  return [...new Set(urls)];
}

function extractAmenities(slice: string): string[] {
  const chunk = between(slice, /amenities:\$R\[\d+\]=\[/, "pools:$R");
  const names = [...chunk.matchAll(/name:"((?:\\.|[^"\\])*)"/g)]
    .map((match) => decodeJsString(match[1] ?? "").trim())
    .filter((name) => name.length >= 3);
  return [...new Set(names)];
}

function extractDistances(slice: string): TurizmplusDistance[] {
  const chunk = between(slice, /pois:\$R\[\d+\]=\[/, "seasonalRates:$R");
  const distances: TurizmplusDistance[] = [];
  const re =
    /category:"([a-z_]+)",name:"((?:\\.|[^"\\])*)",distanceMeters:(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(chunk)) !== null) {
    const meters = Number(match[3]);
    if (!Number.isFinite(meters) || meters <= 0) continue;
    const name = decodeJsString(match[2] ?? "").trim();
    if (!name) continue;
    distances.push({
      name,
      distanceKm: Math.round((meters / 1000) * 100) / 100,
      categoryName: POI_CATEGORY[match[1]!] ?? "Yakın Yerler",
    });
  }
  return distances;
}

function extractPeriods(
  slice: string,
  cleaningFees: Array<{
    start: string;
    end: string;
    amount: number;
    dayCount: number | null;
  }>
): TurizmplusPeriod[] {
  const chunk = between(
    slice,
    /seasonalRates:\$R\[\d+\]=\[/,
    "seasonalPricingDisclosure"
  );
  const periods: TurizmplusPeriod[] = [];
  const re =
    /startDate:"(\d{4}-\d{2}-\d{2})",endDate:"(\d{4}-\d{2}-\d{2})",nightlyRate:(\d+(?:\.\d+)?),minStay:(\d+|null)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(chunk)) !== null) {
    const nightlyRate = Math.round(Number(match[3]));
    if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) continue;
    const startDate = match[1]!;
    const endDate = match[2]!;
    const fee = cleaningFees.find(
      (item) => item.start <= endDate && item.end >= startDate
    );
    periods.push({
      startDate,
      endDate,
      nightlyRate,
      minStay: match[4] === "null" ? null : Number(match[4]),
      cleaningFee: fee?.amount ?? null,
      cleaningDayCount: fee?.dayCount ?? null,
    });
  }
  return periods;
}

function nightCount(raw: string | undefined): number | null {
  if (!raw || raw === "null") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function extractCleaningFees(slice: string) {
  const fees: Array<{
    start: string;
    end: string;
    amount: number;
    dayCount: number | null;
  }> = [];
  const re =
    /name:"Temizlik Ücreti",feeType:"[^"]*",amount:(\d+(?:\.\d+)?),collectAt:"[^"]*",minNights:(null|\d+),maxNights:(null|\d+),startDate:"(\d{4}-\d{2}-\d{2})",endDate:"(\d{4}-\d{2}-\d{2})"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(slice)) !== null) {
    const amount = Math.round(Number(match[1]));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const maxNights = nightCount(match[3]);
    fees.push({
      amount,
      dayCount: maxNights != null ? maxNights + 1 : null,
      start: match[4]!,
      end: match[5]!,
    });
  }
  return fees;
}

function splitBeds(
  bedrooms: number,
  singles: number,
  doubles: number
): TurizmplusRoomBeds[] {
  const count = Math.max(bedrooms, singles + doubles > 0 ? 1 : 0);
  if (count <= 0) return [];
  const rooms = Array.from({ length: count }, () => ({
    singleBeds: 0,
    doubleBeds: 0,
  }));
  let doubleLeft = doubles;
  let index = 0;
  while (doubleLeft > 0) {
    rooms[index % count]!.doubleBeds += 1;
    doubleLeft -= 1;
    index += 1;
  }
  let singleLeft = singles;
  index = 0;
  while (singleLeft > 0) {
    rooms[index % count]!.singleBeds += 1;
    singleLeft -= 1;
    index += 1;
  }
  return rooms;
}

function detectPool(text: string): TurizmplusPool | null {
  const plain = text.replace(/<[^>]+>/g, " ");
  const indoor = /kapalı\s+havuz/i.test(plain);
  const outdoor = /özel\s+havuz|havuzlu/i.test(plain);
  if (!indoor && !outdoor) return null;
  return {
    poolType: indoor ? "Kapalı Havuz" : "Özel Havuz",
    heated: /ısıtmalı\s+havuz/i.test(plain),
    conservative: /korunaklı/i.test(plain),
  };
}

export function parseTurizmplusVilla(html: string): TurizmplusVilla | null {
  if (!html.includes("tourismLicenseNo") || !html.includes("seasonalRates")) {
    return null;
  }
  const slice = propertySlice(html);
  if (!slice) return null;

  const name = jsString(slice, "name");
  if (name.length < 2) return null;

  const district = jsString(slice, "district");
  const city = jsString(slice, "city");
  const longDescription = jsString(slice, "longDescription");
  const shortDescription = jsString(slice, "shortDescription");
  const customRules = jsString(slice, "customRules");
  const bedrooms = jsNumber(slice, "bedrooms") ?? 0;
  const bedRaw = slice.match(/bedTypeBreakdown:\$R\[\d+\]=(\{[^{}]+\})/)?.[1];
  let singles = 0;
  let doubles = 0;
  if (bedRaw) {
    try {
      const beds = JSON.parse(bedRaw) as Record<string, number>;
      singles = Number(beds["bed-single"] ?? 0) || 0;
      doubles = Number(beds["bed-double"] ?? 0) || 0;
    } catch {
      singles = 0;
      doubles = 0;
    }
  }
  const cleaningFees = extractCleaningFees(slice);
  const periods = extractPeriods(slice, cleaningFees);
  const nightlyPrices = periods
    .map((period) => period.nightlyRate)
    .filter((price) => price > 0);
  const latitude = jsNumber(slice, "latitude") ?? 0;
  const longitude = jsNumber(slice, "longitude") ?? 0;
  const description = `${shortDescription}\n${longDescription}`;

  return {
    name,
    shortDescription,
    longDescription,
    locationLabel: [district, city].filter(Boolean).join(" / "),
    districtName: district || null,
    cityName: city || null,
    guests: Math.max(1, jsNumber(slice, "maxGuests") ?? 1),
    bedrooms,
    bathrooms: jsNumber(slice, "bathrooms") ?? 0,
    latitude,
    longitude,
    documentNo: jsString(slice, "tourismLicenseNo"),
    checkInTime: jsString(slice, "checkInTime") || "16:00",
    checkOutTime: jsString(slice, "checkOutTime") || "10:00",
    currency: currencyFromCode(jsString(slice, "currency") || "TRY"),
    minNightlyPrice:
      nightlyPrices.length > 0 ? Math.min(...nightlyPrices) : null,
    damageDeposit: jsNumber(slice, "securityDepositAmount"),
    prepaymentRate: (() => {
      const match = slice.match(
        /dueTiming:"at_booking",percentage:(\d+(?:\.\d+)?)/
      );
      const value = match ? Number(match[1]) : NaN;
      return Number.isFinite(value) && value > 0 ? value : null;
    })(),
    imageUrls: extractImages(slice),
    amenityLabels: extractAmenities(slice),
    distances: extractDistances(slice),
    pool: detectPool(description),
    rooms: splitBeds(bedrooms, singles, doubles),
    allowPets: jsString(slice, "petPolicy") !== "not_allowed",
    allowEvents: jsString(slice, "partyPolicy") !== "not_allowed",
    allowSmoking: jsString(slice, "smokingPolicy") !== "not_allowed",
    allowChildren: !/çocuklara uygun değil|çocuk kabul edilmez/i.test(
      customRules
    ),
    allowBaby: /bebek/i.test(customRules),
    periods,
  };
}
