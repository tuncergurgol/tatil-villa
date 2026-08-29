import { parseDistanceToKm } from "@/lib/tatildeyiz-location-import";
import { sleep } from "@/lib/tatildeyiz-gallery";

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

  return {
    sourceHost: host,
    pageUrl,
    name: titleCaseTr(originalName),
    originalName,
    locationLabel: `${cityName}, ${districtName}`,
    districtName,
    cityName,
    guests,
    bedrooms,
    bathrooms,
    livingRooms: 1,
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
  } catch {
    return null;
  }
  return null;
}

export async function scrapeExternalVillaListing(
  pageUrl: string
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

  const response = await fetch(parsed.toString(), {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status})`);
  }
  const html = await response.text();
  await sleep(400);

  const listing = parseExternalVillaListing(parsed.toString(), html);
  if (!listing) {
    throw new Error(
      `${normalizeHost(parsed.hostname)} ilan bilgisi (fotoğraf, belge, konum) henüz otomatik okunamıyor. Desteklenen tam kurulum: villareyonu.com`
    );
  }

  if (listing.entityId && listing.distances.length === 0) {
    try {
      listing.distances = await fetchVillareyonuDistances(
        listing.entityId,
        parsed.toString()
      );
    } catch {
      // HTML mesafesi yoksa boş kalır; kurulum diğer alanlarla devam eder
    }
  }

  return listing;
}
