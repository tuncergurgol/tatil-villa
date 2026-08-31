import { parseDistanceToKm } from "@/lib/tatildeyiz-location-import";
import { sleep } from "@/lib/tatildeyiz-gallery";
import { mapRoomFeatureNames } from "@/lib/tatildeyiz-room-import";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type ExternalVillaListingDistance = {
  name: string;
  distanceKm: number;
  categoryName: string;
};

export type ExternalVillaListingPool = {
  poolType: string;
  length: number | null;
  width: number | null;
  depth: number | null;
  conservative: boolean;
  heated: boolean;
};

export type ExternalVillaListingRoom = {
  roomType: string;
  name: string;
  singleBeds: number;
  doubleBeds: number;
  features: string[];
  customFeatures: string[];
  sortOrder: number;
};

export type ExternalVillaListing = {
  sourceHost: string;
  pageUrl: string;
  name: string;
  originalName: string;
  locationLabel: string;
  districtName: string | null;
  cityName: string | null;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  livingRooms: number;
  latitude: number;
  longitude: number;
  documentNo: string;
  checkInTime: string;
  checkOutTime: string;
  ribbonText1: string;
  minNightlyPrice: number | null;
  damageDeposit: number | null;
  prepaymentRate: number | null;
  descriptionHtml: string;
  amenityLabels: string[];
  facilityLabels: string[];
  imageUrls: string[];
  distances: ExternalVillaListingDistance[];
  pool: ExternalVillaListingPool | null;
  rooms: ExternalVillaListingRoom[];
  entityId: string | null;
  allowPets: boolean;
  allowEvents: boolean;
  allowSmoking: boolean;
  allowChildren: boolean;
  allowBaby: boolean;
};

function normalizeHost(hostname: string) {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function unescapeRsc(value: string) {
  return value
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractEscapedField(chunk: string, key: string): string | null {
  const escaped = chunk.match(
    new RegExp(`"${key}\\\\":\\\\"([^\\\\]*)\\\\"`)
  )?.[1];
  if (escaped != null && escaped !== "") return unescapeRsc(escaped);
  const raw = chunk.match(new RegExp(`"${key}\\\\":([^,}\\]]+)`))?.[1];
  return raw?.replace(/^"|"$/g, "").trim() || null;
}

function parseIntSafe(value: string | null, fallback: number) {
  const parsed = parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseFloatSafe(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseFloat(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMeter(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseFloat(
    value.replace(",", ".").replace(/[^\d.]/g, "")
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseClock(value: string | null, fallback: string) {
  const match = String(value ?? "").trim().match(/^(\d{1,2})[.:](\d{2})/);
  if (!match) return fallback;
  return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}

function titleCaseTr(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => {
      const lower = part.toLocaleLowerCase("tr-TR");
      return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
    })
    .join(" ");
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#x27;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toHtmlParagraphs(text: string) {
  const blocks = text
    .split(/\n{2,}|(?=\*\*\*)/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks.map((block) => `<p>${block}</p>`).join("");
}

function villareyonuChunk(html: string): string | null {
  const marker = html.search(/evkodu\\":\\"VR-/i);
  if (marker < 0) return null;
  return html.slice(Math.max(0, marker - 25000), marker + 8000);
}

function extractAvailableFeatures(chunk: string): string[] {
  const available = [
    ...chunk.matchAll(
      /"baslik\\":\\"([^\\]+)\\",\\"icon\\":\\"[^"]*\\",\\"IsAvailable\\":1/g
    ),
  ].map((match) => unescapeRsc(match[1]!).trim());
  const highlights = [
    ...chunk.matchAll(/"onecikan\\":\[([\s\S]*?)\]/g),
  ].flatMap((match) =>
    [...match[1]!.matchAll(/"baslik\\":\\"([^\\]+)\\"/g)].map((item) =>
      unescapeRsc(item[1]!).trim()
    )
  );
  return [...new Set([...available, ...highlights].filter(Boolean))];
}

function extractVillareyonuImages(html: string): string[] {
  const names = [
    ...html.matchAll(
      /cdn\.villareyonu\.com\/uploads\/(?!\d+\/)([^"'\\\s?]+\.(?:jpe?g|webp|png))/gi
    ),
  ]
    .map((match) => match[1]!)
    .filter(
      (name) =>
        !/villa-tipleri|villa-kiralama|icon|logo|placeholder/i.test(name)
    );

  const unique = [...new Set(names.map((name) => name.split("?")[0]!))];
  unique.sort((left, right) => {
    const leftNum = parseInt(left.match(/(\d+)/)?.[1] ?? "0", 10);
    const rightNum = parseInt(right.match(/(\d+)/)?.[1] ?? "0", 10);
    return leftNum - rightNum || left.localeCompare(right, "tr");
  });

  return unique.map(
    (name) => `https://cdn.villareyonu.com/uploads/${name}`
  );
}

function extractEntityId(chunk: string): string | null {
  const routingId = extractEscapedField(chunk, "RoutingId");
  const ids = [...chunk.matchAll(/"id\\":\\"(\d+)\\"/g)].map((match) => match[1]!);
  const entityId =
    ids.find((id) => id !== routingId) ?? extractEscapedField(chunk, "id");
  return entityId && /^\d+$/.test(entityId) ? entityId : null;
}

function classifyDistance(label: string, note?: string) {
  const key = label.toLocaleLowerCase("tr-TR");
  if (key.includes("havaliman")) {
    const place = note?.trim();
    return {
      name: place ? `${place} Havalimanı` : "Havalimanı",
      categoryName: "Ulaşım",
    };
  }
  if (key.includes("plaj") || key.includes("deniz")) {
    return { name: "Deniz/Plaj", categoryName: "Popüler Yerler" };
  }
  if (key.includes("otogar")) {
    return { name: "Otogar", categoryName: "Ulaşım" };
  }
  if (key.includes("market")) {
    return { name: "Market", categoryName: "Yakın Yerler" };
  }
  if (/restoran|restaurant/i.test(key)) {
    return { name: "Restaurant", categoryName: "Yakın Yerler" };
  }
  if (key.includes("sağlık") || key.includes("hastane")) {
    return { name: "Sağlık Merkezi", categoryName: "Yakın Yerler" };
  }
  if (key.includes("merkez")) {
    return { name: "Şehir Merkezi", categoryName: "Yakın Yerler" };
  }
  return {
    name: note ? `${label.trim()} (${note.trim()})` : label.trim(),
    categoryName: "Yakın Yerler",
  };
}

function parseDistanceApiPayload(payload: unknown): ExternalVillaListingDistance[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const raw = Array.isArray(root.data)
    ? root.data
    : Array.isArray((root.data as { items?: unknown })?.items)
      ? ((root.data as { items: unknown[] }).items)
    : Array.isArray(root)
      ? root
      : [];
  const rows: ExternalVillaListingDistance[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = String(
      row.baslik ??
        row.title ??
        row.name ??
        row.Name ??
        row.tur ??
        row.kategori ??
        ""
    ).trim();
    const combinedNote = String(
      row.aciklama ??
        row.extra ??
        row.detay ??
        row.location ??
        row.Description ??
        row.description ??
        ""
    ).trim();
    const distanceRaw = String(
      row.deger ??
        row.value ??
        row.mesafe ??
        row.distance ??
        row.Distance ??
        row.km ??
        row.uzaklik ??
        ""
    ).trim();
    if (!label || !distanceRaw) continue;
    const paren = distanceRaw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const amount = paren?.[1]?.trim() || distanceRaw;
    const note = combinedNote || paren?.[2]?.trim() || "";
    const distanceKm = parseDistanceToKm(amount);
    if (distanceKm == null) continue;
    const mapped = classifyDistance(label, note || undefined);
    rows.push({ ...mapped, distanceKm });
  }
  const unique = new Map<string, ExternalVillaListingDistance>();
  for (const row of rows) {
    unique.set(row.name.toLocaleLowerCase("tr-TR"), row);
  }
  return [...unique.values()];
}

async function fetchVillareyonuDistances(
  entityId: string,
  referer: string
): Promise<ExternalVillaListingDistance[]> {
  const response = await fetch(
    `https://api.villareyonu.com/Distance?EntityId=${encodeURIComponent(entityId)}`,
    {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json, text/plain, */*",
        Origin: "https://www.villareyonu.com",
        Referer: referer,
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      cache: "no-store",
    }
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as unknown;
  const parsed = parseDistanceApiPayload(payload);
  if (parsed.length > 0) return parsed;

  // Bazı yanıtlarda dizi doğrudan `data.distances` / tek tek string alanlarda gelir
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    const nested = root.distances ?? (root.data as Record<string, unknown> | undefined)?.distances;
    if (Array.isArray(nested)) {
      return parseDistanceApiPayload({ data: nested });
    }
  }
  return [];
}

function extractVillareyonuDistances(html: string): ExternalVillaListingDistance[] {
  const text = stripTags(
    html
      .replace(/\\u003c/gi, "<")
      .replace(/\\u003e/gi, ">")
      .replace(/\\u0026/gi, "&")
  );
  const rows: ExternalVillaListingDistance[] = [];
  const patterns: Array<{
    re: RegExp;
    name: (match: RegExpExecArray) => string;
    categoryName: string;
  }> = [
    {
      re: /Havalimanı\s+([\d.,]+\s*(?:km|m))\s*\(([^)]+)\)/gi,
      name: (match) => `${match[2]!.trim()} Havalimanı`,
      categoryName: "Ulaşım",
    },
    {
      re: /Plaj\s+([\d.,]+\s*(?:km|m))/gi,
      name: () => "Deniz/Plaj",
      categoryName: "Popüler Yerler",
    },
    {
      re: /Otogar\s+([\d.,]+\s*(?:km|m))/gi,
      name: () => "Otogar",
      categoryName: "Ulaşım",
    },
    {
      re: /Market\s+([\d.,]+\s*(?:km|m))/gi,
      name: () => "Market",
      categoryName: "Yakın Yerler",
    },
    {
      re: /Restaurant\s+([\d.,]+\s*(?:km|m))/gi,
      name: () => "Restaurant",
      categoryName: "Yakın Yerler",
    },
    {
      re: /Sağlık Merkezi\s+([\d.,]+\s*(?:km|m))/gi,
      name: () => "Sağlık Merkezi",
      categoryName: "Yakın Yerler",
    },
    {
      re: /En Yakın Merkez\s+([\d.,]+\s*(?:km|m))/gi,
      name: () => "Şehir Merkezi",
      categoryName: "Yakın Yerler",
    },
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.re.source, pattern.re.flags);
    while ((match = re.exec(text)) !== null) {
      const distanceKm = parseDistanceToKm(match[1]);
      if (distanceKm == null) continue;
      rows.push({
        name: pattern.name(match),
        distanceKm,
        categoryName: pattern.categoryName,
      });
    }
  }

  const unique = new Map<string, ExternalVillaListingDistance>();
  for (const row of rows) {
    unique.set(row.name.toLocaleLowerCase("tr-TR"), row);
  }
  return [...unique.values()];
}

function extractVillareyonuDescription(html: string, fallbackName: string) {
  const start = html.search(
    /<p[^>]*>\s*Villa [^<]{0,120}mevkisinde bulunmaktadır/i
  );
  if (start >= 0) {
    const slice = html.slice(start, start + 9000);
    const paragraphs = [...slice.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => stripTags(match[1] ?? ""))
      .filter((text) => text.length > 20)
      .slice(0, 10);
    if (paragraphs.length > 0) {
      return toHtmlParagraphs(paragraphs.join("\n\n"));
    }
  }
  return `<p>${fallbackName}</p>`;
}

function mapRoomTypeFromName(roomName: string): string {
  const key = roomName.toLocaleLowerCase("tr-TR");
  if (key.includes("mutfak")) return "mutfak";
  if (key.includes("salon") || key.includes("oturma")) return "salon";
  if (key.includes("banyo")) return "banyo";
  return "yatak_odasi";
}

function mapRoomItemFeature(itemName: string): string | null {
  const key = itemName.trim().toLocaleLowerCase("tr-TR");
  if (/yatak/.test(key)) return null;
  if (/banyo|wc/.test(key)) return "Özel Banyo";
  if (/elbise\s*dolab/.test(key)) return "Elbise Dolabı";
  if (/klima/.test(key)) return "Klima";
  if (/jakuzi/.test(key)) return "Jakuzi";
  if (/sauna/.test(key)) return "Sauna";
  if (/^tv$|televizyon/.test(key)) return "Televizyon";
  if (/balkon/.test(key)) return "Balkon";
  if (/teras/.test(key)) return "Teras";
  if (/şömine|somine/.test(key)) return "Şömine";
  if (/bebek/.test(key)) return "Bebek Yatağı";
  return itemName.trim();
}

export function parseVillareyonuRooms(html: string): ExternalVillaListingRoom[] {
  const rooms: ExternalVillaListingRoom[] = [];
  const roomBlocks = [
    ...html.matchAll(
      /"room_name\\":\\"([^\\]+)\\",\\"items\\":\[([\s\S]*?)\]\}/g
    ),
  ];

  let bedroomIndex = 0;
  let sortOrder = 0;
  for (const block of roomBlocks) {
    const roomName = unescapeRsc(block[1] ?? "").trim();
    const itemsRaw = block[2] ?? "";
    if (!roomName) continue;

    let singleBeds = 0;
    let doubleBeds = 0;
    const featureNames: string[] = [];

    for (const item of itemsRaw.matchAll(
      /"item_name\\":\\"([^\\]+)\\",\\"icon\\":\\"[^"]*\\",\\"value\\":(\d+)/g
    )) {
      const itemName = unescapeRsc(item[1] ?? "").trim();
      const value = parseInt(item[2] ?? "0", 10);
      if (!itemName || !Number.isFinite(value) || value <= 0) continue;

      const key = itemName.toLocaleLowerCase("tr-TR");
      if (/çift\s*kişilik\s*yatak|cift\s*kisilik\s*yatak/.test(key)) {
        doubleBeds += value;
        continue;
      }
      if (/tek\s*kişilik\s*yatak|tek\s*kisilik\s*yatak/.test(key)) {
        singleBeds += value;
        continue;
      }

      const feature = mapRoomItemFeature(itemName);
      if (feature) {
        for (let i = 0; i < value; i += 1) featureNames.push(feature);
      }
    }

    const roomType = mapRoomTypeFromName(roomName);
    sortOrder += 1;
    if (roomType === "yatak_odasi") bedroomIndex += 1;

    const { features, customFeatures } = mapRoomFeatureNames(featureNames);
    rooms.push({
      roomType,
      name:
        roomType === "yatak_odasi"
          ? String(bedroomIndex || sortOrder)
          : roomName.replace(/^\d+\.\s*/, "").trim() || roomName,
      singleBeds,
      doubleBeds,
      features,
      customFeatures,
      sortOrder,
    });
  }

  return rooms;
}

const AMENITY_ALIASES: Record<string, string> = {
  "internet bağlantısı": "Wi-Fi",
  "kablosuz modem": "Wi-Fi",
  "çamaşır makinası": "Çamaşır Makinesi",
  "bulaşık makinası": "Bulaşık makinesi",
  "ankastre fırın": "Fırın",
  "mikrodalga fırın": "Mikrodalga",
  "ankastre ocak": "Ocak",
  "su ısıtıcısı": "Kettle",
  "tencere ve tava takımı": "Mutfak Gereçleri",
  "yemek takımı": "Mutfak Gereçleri",
  "kaşık çatal bıçak takımı": "Mutfak Gereçleri",
  "bardak takımı": "Mutfak Gereçleri",
  tv: "Düz ekran TV",
  "uydu alıcı": "Uydu Yayını",
  jakuzi: "Jakuzi",
  sauna: "Saunalı",
  "özel yüzme havuzu": "Özel Havuzlu",
  "otopark / park yeri": "Otopark",
  otopark: "Otopark",
  "ütü / ütü masası": "Ütü",
  "barbekü (mangal)": "Barbekü",
  veranda: "Teras Alanı",
  balkon: "Balkon",
  "doğa manzarası": "Doğa Manzarası",
  "merkeze yakın": "Merkeze Yakın",
  klima: "Klima",
  buzdolabı: "Buzdolabı",
  "yemek masası": "Yemek Masası",
  "bahçe alanı": "Bahçe",
  "özel bahçeli": "Bahçe",
  "full eşyalı ve mobilyalı": "Mutfak Gereçleri",
};

const FACILITY_ALIASES: Record<string, string> = {
  "sinema odası": "Sinema Odası Olanlar",
  "jakuzi": "Jakuzili Villalar",
  sauna: "Sauna ve Hamamlı Villalar",
  "saunalı": "Sauna ve Hamamlı Villalar",
};

function mapAmenityLabels(labels: string[]) {
  const amenities = new Set<string>();
  const facilities = new Set<string>();
  for (const raw of labels) {
    const key = raw.trim().toLocaleLowerCase("tr-TR");
    const amenity = AMENITY_ALIASES[key] ?? raw.trim();
    amenities.add(amenity);
    const facility = FACILITY_ALIASES[key];
    if (facility) facilities.add(facility);
  }
  return {
    amenityLabels: [...amenities],
    facilityLabels: [...facilities],
  };
}

export function parseVillareyonuListing(
  pageUrl: string,
  html: string
): ExternalVillaListing | null {
  const chunk = villareyonuChunk(html);
  if (!chunk) return null;

  const originalName =
    extractEscapedField(chunk, "baslik") ??
    extractEscapedField(chunk, "kisa_icerik") ??
    "Villa";
  const guests = parseIntSafe(extractEscapedField(chunk, "kisi"), 1);
  const bedrooms = parseIntSafe(extractEscapedField(chunk, "yatak_odasi"), 1);
  const bathrooms = parseIntSafe(extractEscapedField(chunk, "banyo"), 1);
  const latitude = parseFloatSafe(extractEscapedField(chunk, "enlem")) ?? 0;
  const longitude = parseFloatSafe(extractEscapedField(chunk, "boylam")) ?? 0;
  const documentNo = (extractEscapedField(chunk, "gavelBelgeNo") ?? "").trim();
  const features = extractAvailableFeatures(chunk);
  const mapped = mapAmenityLabels(features);
  const entityId = extractEntityId(chunk);
  const poolType = extractEscapedField(chunk, "yuzme_havuzu") ?? "";
  const heated =
    (extractEscapedField(chunk, "Isıtmalı Havuz") ?? "") === "1" ||
    features.some((item) => /ısıtmalı havuz/i.test(item));

  let host = "villareyonu.com";
  try {
    host = normalizeHost(new URL(pageUrl).hostname);
  } catch {
    // pageUrl zaten doğrulanmış olmalı
  }

  const locationMatch = html.match(
    /Antalya\s*\/\s*([^<\n]+?)\s+Kiralık Villa/i
  );
  const districtName =
    locationMatch?.[1]?.replace(/Kiralık Villa/gi, "").trim() || "Demre";
  const cityName = "Antalya";
  const rooms = parseVillareyonuRooms(html);
  const bedroomRooms = rooms.filter((room) => room.roomType === "yatak_odasi");
  const livingRooms =
    rooms.filter((room) => room.roomType === "salon").length || 1;

  return {
    sourceHost: host,
    pageUrl,
    name: titleCaseTr(originalName),
    originalName,
    locationLabel: `${cityName}, ${districtName}`,
    districtName,
    cityName,
    guests,
    bedrooms: bedroomRooms.length > 0 ? bedroomRooms.length : bedrooms,
    bathrooms,
    livingRooms,
    latitude,
    longitude,
    documentNo,
    checkInTime: parseClock(extractEscapedField(chunk, "giris_saat"), "16:00"),
    checkOutTime: parseClock(extractEscapedField(chunk, "cikis_saat"), "10:00"),
    ribbonText1: extractEscapedField(chunk, "ribbon") ?? "",
    minNightlyPrice: parseIntSafe(extractEscapedField(chunk, "minfiyat"), 0) || null,
    damageDeposit: parseIntSafe(extractEscapedField(chunk, "hasar"), 0) || null,
    prepaymentRate: parseIntSafe(extractEscapedField(chunk, "depozito"), 0) || null,
    descriptionHtml: extractVillareyonuDescription(html, originalName),
    amenityLabels: mapped.amenityLabels,
    facilityLabels: mapped.facilityLabels,
    imageUrls: extractVillareyonuImages(html),
    distances: extractVillareyonuDistances(html),
    pool: /özel|var|evet/i.test(poolType)
      ? {
          poolType: poolType.trim() || "Özel Havuz",
          length: parseMeter(extractEscapedField(chunk, "yuzme_havuzu_uzunluk")),
          width: parseMeter(extractEscapedField(chunk, "yuzme_havuzu_genislik")),
          depth: parseMeter(extractEscapedField(chunk, "yuzme_havuzu_derinlik")),
          conservative:
            (extractEscapedField(chunk, "tam_korunakli_havuz") ?? "")
              .toLocaleLowerCase("tr-TR")
              .startsWith("evet"),
          heated,
        }
      : null,
    rooms,
    allowPets: !/Evcil Hayvan Giremez/i.test(chunk),
    allowEvents: !/Parti Düzenlenemez/i.test(chunk),
    allowSmoking: !/Sigara İçilmez/i.test(chunk),
    allowChildren: true,
    allowBaby: true,
    entityId,
  };
}

export function parseExternalVillaListing(
  pageUrl: string,
  html: string
): ExternalVillaListing | null {
  try {
    const host = normalizeHost(new URL(pageUrl).hostname);
    if (host.includes("villareyonu")) {
      return parseVillareyonuListing(pageUrl, html);
    }
    // Aynı Next.js / routingData ailesi — hafif kurulum (başlık + görsel + entity)
    if (
      host.includes("villaekstra") ||
      host.includes("villavillam") ||
      host.includes("villapaketi") ||
      host.includes("villaciniz") ||
      host.includes("villayolu") ||
      host.includes("ovillam") ||
      host.includes("kiralikvillaniz") ||
      host.includes("villakilavuzu") ||
      host.includes("mustakilvillam") ||
      host.includes("myvillacity") ||
      host.includes("tatilpremium")
    ) {
      return parseVillaApiFamilyLightListing(pageUrl, html);
    }
    return parseGenericHtmlListing(pageUrl, html);
  } catch {
    return null;
  }
}

function extractOgImages(html: string): string[] {
  const urls = [
    ...html.matchAll(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi
    ),
    ...html.matchAll(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi
    ),
  ]
    .map((match) => match[1]!.trim())
    .filter((url) => /^https?:\/\//i.test(url));
  return [...new Set(urls)].slice(0, 40);
}

function extractPageTitleTag(html: string): string {
  const raw =
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ??
    "";
  return raw.split("|")[0]?.split("-")[0]?.trim() || raw;
}

function extractRoutingTitle(html: string, pageUrl: string): string | null {
  try {
    const slug = new URL(pageUrl).pathname.replace(/\/+$/, "").split("/").pop() ?? "";
    if (!slug) return null;
    const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `"baslik\\\\":\\\\"([^\\\\]+)\\\\"[\\s\\S]{0,200}"url\\\\":\\\\"\\/?${escapedSlug}\\\\"`,
        "i"
      ),
      new RegExp(
        `"url\\\\":\\\\"\\/?${escapedSlug}\\\\"[\\s\\S]{0,200}"baslik\\\\":\\\\"([^\\\\]+)\\\\"`,
        "i"
      ),
      new RegExp(
        `"title"\\s*:\\s*"([^"]+)"[\\s\\S]{0,120}"url"\\s*:\\s*"\\/?${escapedSlug}"`,
        "i"
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return unescapeRsc(match[1]).trim();
    }
  } catch {
    return null;
  }
  return null;
}

function extractRoutingEntityId(html: string, pageUrl: string): string | null {
  try {
    const slug = new URL(pageUrl).pathname.replace(/\/+$/, "").split("/").pop() ?? "";
    if (!slug) return null;
    const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const near = html.match(
      new RegExp(
        `routingData\\\\":\\{\\\\"id\\\\":\\\\"(\\d+)\\\\"[\\s\\S]{0,400}url\\\\":\\\\"\\/?${escapedSlug}\\\\"`,
        "i"
      )
    );
    if (near?.[1]) return near[1];
    const urlParam = new URL(pageUrl).searchParams.get("entityId");
    if (urlParam && /^\d+$/.test(urlParam)) return urlParam;
  } catch {
    return null;
  }
  return null;
}

function parseVillaApiFamilyLightListing(
  pageUrl: string,
  html: string
): ExternalVillaListing | null {
  const host = normalizeHost(new URL(pageUrl).hostname);
  const name =
    extractRoutingTitle(html, pageUrl) ||
    extractPageTitleTag(html) ||
    titleCaseTr(
      new URL(pageUrl).pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ||
        "Yeni Villa"
    );
  if (!name || name.length < 2) return null;

  const entityId = extractRoutingEntityId(html, pageUrl);
  const documentMatch =
    html.match(/HI[-\s]?\d{4,}/i)?.[0] ||
    html.match(/VR[-\s]?\d{3,}/i)?.[0] ||
    html.match(/07[-\s]?\d{3,}/)?.[0] ||
    "";

  return {
    sourceHost: host,
    pageUrl,
    name,
    originalName: name,
    locationLabel: "",
    districtName: null,
    cityName: null,
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    livingRooms: 1,
    latitude: 0,
    longitude: 0,
    documentNo: documentMatch.replace(/\s+/g, "-").toUpperCase(),
    checkInTime: "16:00",
    checkOutTime: "10:00",
    ribbonText1: "",
    minNightlyPrice: null,
    damageDeposit: null,
    prepaymentRate: null,
    descriptionHtml: "",
    amenityLabels: [],
    facilityLabels: [],
    imageUrls: extractOgImages(html),
    distances: [],
    pool: null,
    rooms: [],
    entityId,
    allowPets: false,
    allowEvents: false,
    allowSmoking: false,
    allowChildren: true,
    allowBaby: true,
  };
}

function extractBravoServiceId(html: string): string | null {
  const bravoMatch = html.match(
    /bravo_booking_data\s*=\s*(\{[\s\S]*?\})\s*[\r\n;]/
  );
  if (bravoMatch?.[1]) {
    try {
      const data = JSON.parse(bravoMatch[1]) as {
        id?: number | string;
        max_guests?: number | string;
      };
      if (data.id != null && String(data.id).trim()) {
        return String(data.id).trim();
      }
    } catch {
      // ignore
    }
  }
  return (
    html.match(
      /<input[^>]+name=["']service_id["'][^>]+value=["'](\d+)["']/i
    )?.[1] ?? null
  );
}

function extractBravoMaxGuests(html: string): number | null {
  const bravoMatch = html.match(
    /bravo_booking_data\s*=\s*(\{[\s\S]*?\})\s*[\r\n;]/
  );
  if (!bravoMatch?.[1]) return null;
  try {
    const data = JSON.parse(bravoMatch[1]) as { max_guests?: number | string };
    const guests = Number(data.max_guests);
    return Number.isFinite(guests) && guests > 0 ? guests : null;
  } catch {
    return null;
  }
}

function parseGenericHtmlListing(
  pageUrl: string,
  html: string
): ExternalVillaListing | null {
  // Laravel/Next hata sayfası — ilan değil
  if (
    /Server hatas/i.test(html) &&
    html.length < 5000 &&
    !/bravo_booking_data|og:title|service_id/i.test(html)
  ) {
    return null;
  }

  const host = normalizeHost(new URL(pageUrl).hostname);
  const ogTitle =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
    )?.[1];
  const name =
    (ogTitle ? unescapeRsc(ogTitle).replace(/\s+/g, " ").trim() : "") ||
    extractPageTitleTag(html) ||
    titleCaseTr(
      new URL(pageUrl).pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ||
        ""
    );
  if (!name || name.length < 2) return null;
  if (/server hatas|404|not found|sayfa bulunamad/i.test(name)) return null;

  const entityId = extractBravoServiceId(html);
  const guests = extractBravoMaxGuests(html) ?? 4;
  const documentMatch =
    html.match(/HI[-\s]?\d{4,}/i)?.[0] ||
    html.match(/VR[-\s]?\d{3,}/i)?.[0] ||
    html.match(/07[-\s]?\d{3,}/)?.[0] ||
    "";

  const bedroomsMatch =
    html.match(/(\d+)\s*(?:Yatak\s*Odas|Yatak\s*oda|Bedroom)/i)?.[1] ||
    html.match(/Yatak\s*Odas[^\d]{0,20}(\d+)/i)?.[1];
  const bathroomsMatch =
    html.match(/(\d+)\s*(?:Banyo|Bathroom)/i)?.[1] ||
    html.match(/Banyo[^\d]{0,20}(\d+)/i)?.[1];

  return {
    sourceHost: host,
    pageUrl,
    name,
    originalName: name,
    locationLabel: "",
    districtName: null,
    cityName: null,
    guests,
    bedrooms: parseIntSafe(bedroomsMatch ?? null, 2),
    bathrooms: parseIntSafe(bathroomsMatch ?? null, 1),
    livingRooms: 1,
    latitude: 0,
    longitude: 0,
    documentNo: documentMatch.replace(/\s+/g, "-").toUpperCase(),
    checkInTime: "16:00",
    checkOutTime: "10:00",
    ribbonText1: "",
    minNightlyPrice: null,
    damageDeposit: null,
    prepaymentRate: null,
    descriptionHtml: "",
    amenityLabels: [],
    facilityLabels: [],
    imageUrls: extractOgImages(html),
    distances: [],
    pool: null,
    rooms: [],
    entityId,
    allowPets: false,
    allowEvents: false,
    allowSmoking: false,
    allowChildren: true,
    allowBaby: true,
  };
}

function buildMinimalListingFromUrl(
  pageUrl: string,
  fallbackName?: string
): ExternalVillaListing {
  const parsed = new URL(pageUrl);
  const host = normalizeHost(parsed.hostname);
  const slugName = titleCaseTr(
    parsed.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ||
      "Yeni Villa"
  );
  const name = fallbackName?.trim() || slugName;
  return {
    sourceHost: host,
    pageUrl,
    name,
    originalName: name,
    locationLabel: "",
    districtName: null,
    cityName: null,
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    livingRooms: 1,
    latitude: 0,
    longitude: 0,
    documentNo: "",
    checkInTime: "16:00",
    checkOutTime: "10:00",
    ribbonText1: "",
    minNightlyPrice: null,
    damageDeposit: null,
    prepaymentRate: null,
    descriptionHtml: "",
    amenityLabels: [],
    facilityLabels: [],
    imageUrls: [],
    distances: [],
    pool: null,
    rooms: [],
    entityId: null,
    allowPets: false,
    allowEvents: false,
    allowSmoking: false,
    allowChildren: true,
    allowBaby: true,
  };
}

function slugBaseCandidates(slug: string): string[] {
  const normalized = slug.trim().toLowerCase();
  const candidates = new Set<string>([normalized]);
  const withoutTrailingNum = normalized.replace(/-\d+$/, "");
  if (withoutTrailingNum && withoutTrailingNum !== normalized) {
    candidates.add(withoutTrailingNum);
  }
  const parts = normalized.split("-").filter(Boolean);
  if (parts.length >= 2) {
    candidates.add(parts.slice(0, 2).join("-"));
  }
  return [...candidates];
}

async function findSitemapAlternateUrl(
  pageUrl: string
): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }
  const slug =
    parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop() || "";
  if (!slug || slug.length < 4) return null;

  const bases = slugBaseCandidates(slug);
  const sitemapCandidates = [
    `${parsed.origin}/sitemap-space.xml`,
    `${parsed.origin}/sitemap.xml`,
  ];

  for (const sitemapUrl of sitemapCandidates) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "application/xml,text/xml,*/*",
        },
        cache: "no-store",
        redirect: "follow",
      });
      if (!response.ok) continue;
      const xml = await response.text();
      // sitemap index → space alt sitemap
      const nested = [
        ...xml.matchAll(/<loc>\s*(https?:\/\/[^<]*sitemap[^<]*)\s*<\/loc>/gi),
      ].map((match) => match[1]!.trim());
      const bodies = [xml];
      for (const nestedUrl of nested.slice(0, 4)) {
        try {
          const nestedRes = await fetch(nestedUrl, {
            headers: { "User-Agent": BROWSER_UA },
            cache: "no-store",
          });
          if (nestedRes.ok) bodies.push(await nestedRes.text());
        } catch {
          // ignore
        }
      }

      const locs = new Set<string>();
      for (const body of bodies) {
        for (const match of body.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi)) {
          locs.add(match[1]!.trim());
        }
      }

      const scored: Array<{ url: string; score: number }> = [];
      for (const loc of locs) {
        let locUrl: URL;
        try {
          locUrl = new URL(loc);
        } catch {
          continue;
        }
        if (normalizeHost(locUrl.hostname) !== normalizeHost(parsed.hostname)) {
          continue;
        }
        const locSlug =
          locUrl.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop() ||
          "";
        if (!locSlug) continue;
        if (locSlug === slug) {
          scored.push({ url: loc, score: 100 });
          continue;
        }
        for (const base of bases) {
          if (locSlug === base) scored.push({ url: loc, score: 90 });
          else if (locSlug.startsWith(`${base}-`)) scored.push({ url: loc, score: 80 });
          else if (locSlug.includes(base)) scored.push({ url: loc, score: 60 });
        }
      }

      scored.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
      const best = scored[0];
      if (best && best.score >= 60 && best.url !== pageUrl) {
        return best.url;
      }
    } catch {
      // sonraki sitemap
    }
  }
  return null;
}

export type ScrapeExternalVillaListingOptions = {
  /** Sayfa okunamazsa kullanılacak villa adı */
  fallbackName?: string;
  /** Ad veya Drive ile devam için minimal kayıt üret */
  allowMinimalFallback?: boolean;
};

export async function scrapeExternalVillaListing(
  pageUrl: string,
  options?: ScrapeExternalVillaListingOptions
): Promise<ExternalVillaListing> {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl.trim());
  } catch {
    throw new Error("Geçersiz villa sayfası URL'si");
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("URL http veya https olmalı");
  }

  const entityFromUrl = parsed.searchParams.get("entityId");
  const host = normalizeHost(parsed.hostname);
  const fallbackName = options?.fallbackName?.trim() || "";
  const allowMinimal = Boolean(options?.allowMinimalFallback || fallbackName);

  async function fetchHtml(url: string): Promise<{ ok: boolean; status: number; html: string }> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      redirect: "follow",
    });
    const html = response.ok ? await response.text() : "";
    if (response.ok) await sleep(400);
    return { ok: response.ok, status: response.status, html };
  }

  let workingUrl = parsed.toString();
  let fetched = await fetchHtml(workingUrl);

  if (!fetched.ok || !fetched.html) {
    const alternate = await findSitemapAlternateUrl(workingUrl);
    if (alternate) {
      const altFetched = await fetchHtml(alternate);
      if (altFetched.ok && altFetched.html) {
        workingUrl = alternate;
        fetched = altFetched;
        parsed = new URL(alternate);
      }
    }
  }

  let html = fetched.html;
  if (!fetched.ok && entityFromUrl && /^\d+$/.test(entityFromUrl)) {
    html = "";
  } else if (!fetched.ok && !allowMinimal) {
    throw new Error(
      `Sayfa alınamadı (${fetched.status}). Kaynak site hata veriyor olabilir; doğru villa URL'sini kontrol edin.`
    );
  }

  let listing = html ? parseExternalVillaListing(workingUrl, html) : null;

  if (!listing && entityFromUrl && /^\d+$/.test(entityFromUrl)) {
    listing = buildMinimalListingFromUrl(workingUrl, fallbackName);
    listing.entityId = entityFromUrl;
  }

  if (!listing && allowMinimal) {
    listing = buildMinimalListingFromUrl(workingUrl, fallbackName);
  }

  if (!listing) {
    throw new Error(
      `${host} ilan bilgisi okunamadı. Tam kurulum: villareyonu.com. Hafif kurulum: villaekstra / villaoteltatili ve diğer desteklenen siteler (gerekirse ?entityId= ekleyin).`
    );
  }

  if (workingUrl !== pageUrl.trim() && workingUrl !== new URL(pageUrl.trim()).toString()) {
    // sitemap alternatifi kullanıldı — pageUrl zaten listing'de
  }

  if (listing.entityId && listing.distances.length === 0 && host.includes("villareyonu")) {
    try {
      listing.distances = await fetchVillareyonuDistances(
        listing.entityId,
        workingUrl
      );
    } catch {
      // HTML mesafesi yoksa boş kalır; kurulum diğer alanlarla devam eder
    }
  }

  // Fiyat/takvim senkronunda entityId URL'de olsun (yalnızca villa-api ailesi / CF bypass)
  try {
    const syncParsed = new URL(listing.pageUrl || workingUrl);
    const syncHost = normalizeHost(syncParsed.hostname);
    const needsEntityQuery =
      syncHost.includes("villaekstra") ||
      syncHost.includes("villavillam") ||
      syncHost.includes("villapaketi") ||
      syncHost.includes("villaciniz") ||
      syncHost.includes("villayolu") ||
      syncHost.includes("ovillam") ||
      syncHost.includes("kiralikvillaniz") ||
      syncHost.includes("villakilavuzu") ||
      syncHost.includes("mustakilvillam") ||
      syncHost.includes("myvillacity") ||
      syncHost.includes("tatilpremium") ||
      syncHost.includes("villareyonu");
    if (
      listing.entityId &&
      needsEntityQuery &&
      !syncParsed.searchParams.get("entityId")
    ) {
      syncParsed.searchParams.set("entityId", listing.entityId);
      listing.pageUrl = syncParsed.toString();
    } else {
      listing.pageUrl = listing.pageUrl || workingUrl;
    }
  } catch {
    listing.pageUrl = workingUrl;
  }

  return listing;
}
