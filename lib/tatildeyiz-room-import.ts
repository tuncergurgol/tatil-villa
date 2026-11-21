import type { PrismaClient } from "@prisma/client";
import {
  ROOM_TYPE_OPTIONS,
  isDefaultRoomFeature,
  uniqueRoomFeatures,
} from "@/lib/villa-room-features";
import {
  fetchTatildeyizPropertyWithDelay,
  type TatildeyizProperty,
  type TatildeyizPropertyRoom,
} from "@/lib/tatildeyiz-property";
import {
  syncVillaRoomFeatureCatalog,
  syncVillaRooms,
} from "@/lib/queries/villa-rooms";

export type MappedVillaRoom = {
  roomType: string;
  name: string;
  singleBeds: number;
  doubleBeds: number;
  imageUrl: string;
  features: string[];
  customFeatures: string[];
  sortOrder: number;
};

export type ImportVillaRoomsResult = {
  slug: string;
  villaId?: string;
  dbVillaId?: number | null;
  name?: string;
  status: "success" | "skipped" | "error";
  sourceRoomCount?: number;
  updatedRoomCount?: number;
  source?: "PropertyRooms" | "description";
  rooms?: MappedVillaRoom[];
  error?: string;
};

const ROOM_TYPE_BY_LABEL: Record<string, string> = Object.fromEntries(
  ROOM_TYPE_OPTIONS.map((option) => [option.label.toLowerCase(), option.value])
);

const TURKISH_NUMBER_WORDS: Record<string, number> = {
  bir: 1,
  iki: 2,
  uc: 3,
  üç: 3,
  dort: 4,
  dört: 4,
  bes: 5,
  beş: 5,
  alti: 6,
  altı: 6,
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/´/g, "'")
    .trim();
}

export function mapTatildeyizRoomTypeName(name: string | null | undefined) {
  const normalized = normalizeText(name ?? "");
  if (!normalized) return "yatak_odasi";

  const mapped = ROOM_TYPE_BY_LABEL[normalized];
  if (mapped) return mapped;

  if (normalized.includes("yatak")) return "yatak_odasi";
  if (normalized.includes("salon")) return "salon";
  if (normalized.includes("mutfak")) return "mutfak";
  if (normalized.includes("banyo")) return "banyo";

  return "yatak_odasi";
}

export function parseBedCountsFromText(text: string) {
  let singleBeds = 0;
  let doubleBeds = 0;
  const normalized = normalizeText(text.replace(/<[^>]+>/g, " "));

  const patterns: Array<{ regex: RegExp; field: "single" | "double" }> = [
    {
      regex: /(\d+)\s*tek\s*kisilik(?:\s*yatak)?/g,
      field: "single",
    },
    {
      regex: /(\d+)\s*cift\s*kisilik(?:\s*yatak)?/g,
      field: "double",
    },
  ];

  for (const { regex, field } of patterns) {
    for (const match of normalized.matchAll(regex)) {
      const count = parseInt(match[1] ?? "0", 10);
      if (!Number.isFinite(count) || count <= 0) continue;
      if (field === "single") singleBeds += count;
      else doubleBeds += count;
    }
  }

  if (singleBeds === 0 && doubleBeds === 0) {
    for (const [word, count] of Object.entries(TURKISH_NUMBER_WORDS)) {
      const doublePattern = new RegExp(
        `(?:${word}|${word}\\s+adet)\\s+cift\\s*kisilik`,
        "g"
      );
      if (doublePattern.test(normalized)) {
        doubleBeds += count;
      }

      const singlePattern = new RegExp(
        `(?:${word}|${word}\\s+adet)\\s+tek\\s*kisilik`,
        "g"
      );
      if (singlePattern.test(normalized)) {
        singleBeds += count;
      }
    }
  }

  return { singleBeds, doubleBeds };
}

export function mapRoomFeatureNames(names: string[]) {
  const features = uniqueRoomFeatures(names);
  return {
    features,
    customFeatures: features.filter((feature) => !isDefaultRoomFeature(feature)),
  };
}

function extractFeatureNamesFromDescriptionText(text: string) {
  const normalized = normalizeText(text.replace(/<[^>]+>/g, " "));
  const found: string[] = [];

  const rules: Array<{ pattern: RegExp; feature: string }> = [
    { pattern: /ebeveyn\s*banyo|ozel\s*banyo/, feature: "Özel Banyo" },
    { pattern: /ortak\s*banyo/, feature: "Ortak Banyo" },
    { pattern: /\bjakuzi\b/, feature: "Jakuzi" },
    { pattern: /\bklima\b/, feature: "Klima" },
    { pattern: /elbise\s*dolab/, feature: "Elbise Dolabı" },
    {
      pattern: /nevresim|havlu/,
      feature: "Havlu & Nevresim",
    },
    { pattern: /balkon/, feature: "Balkon" },
    { pattern: /teras/, feature: "Teras" },
    { pattern: /somine|şömine/, feature: "Şömine" },
    { pattern: /televizyon|\blcd\b/, feature: "Televizyon" },
    { pattern: /bebek\s*yatak/, feature: "Bebek Yatağı" },
    { pattern: /sauna/, feature: "Sauna" },
    { pattern: /turk\s*hamam|türk\s*hamam/, feature: "Türk Hamamı" },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(normalized)) {
      found.push(rule.feature);
    }
  }

  return found;
}

function mapPropertyRoom(
  room: TatildeyizPropertyRoom,
  sortOrder: number
): MappedVillaRoom {
  const amenityNames =
    room.roomAmenities
      ?.map((item) => item.roomAmenity?.name ?? "")
      .filter(Boolean) ?? [];

  const { features, customFeatures } = mapRoomFeatureNames(amenityNames);

  return {
    roomType: mapTatildeyizRoomTypeName(room.roomTypes?.name),
    name: room.roomName?.trim() || String(sortOrder),
    singleBeds: Math.max(0, room.singleBed ?? 0),
    doubleBeds: Math.max(0, room.doubleBed ?? 0),
    imageUrl: room.roomImage?.trim() ?? "",
    features,
    customFeatures,
    sortOrder,
  };
}

export function mapTatildeyizPropertyRooms(
  property: Pick<TatildeyizProperty, "PropertyRooms">
): MappedVillaRoom[] {
  const rooms = property.PropertyRooms ?? [];
  return rooms.map((room, index) => mapPropertyRoom(room, index + 1));
}

export function parseBedroomSectionsFromDescription(
  description: string | null | undefined
): MappedVillaRoom[] {
  if (!description?.trim()) return [];

  const html = description.replace(/&nbsp;/g, " ");
  const bedroomSectionMatch =
    html.match(/<strong>\s*Yatak\s*Odalari\s*<\/strong>/i) ??
    html.match(/<strong>\s*Yatak\s*Odalar[ıi]\s*<\/strong>/i);

  if (!bedroomSectionMatch || bedroomSectionMatch.index == null) {
    return [];
  }

  const sectionStart = bedroomSectionMatch.index + bedroomSectionMatch[0].length;
  const nextSectionMatch = html
    .slice(sectionStart)
    .match(
      /<strong>\s*(?:Mutfak|Salon|Kapasite|Internet|Klima|Temizlik|Havuz|Onemli|Depozito)\b/i
    );
  const sectionEnd =
    nextSectionMatch?.index != null
      ? sectionStart + nextSectionMatch.index
      : html.length;
  const bedroomSection = html.slice(sectionStart, sectionEnd);

  const roomPattern =
    /<strong>\s*(\d+)\.\s*Yatak\s*odas[ıi]:?\s*<\/strong>([\s\S]*?)(?=<strong>\s*\d+\.\s*Yatak\s*odas[ıi]:?\s*<\/strong>|$)/gi;

  const rooms: MappedVillaRoom[] = [];

  for (const match of bedroomSection.matchAll(roomPattern)) {
    const sortOrder = parseInt(match[1] ?? "0", 10);
    const body = (match[2] ?? "")
      .replace(/Yatak odalar[ıi]nda[\s\S]*$/i, "")
      .trim();
    if (!Number.isFinite(sortOrder) || sortOrder <= 0) continue;

    const plainText = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const { singleBeds, doubleBeds } = parseBedCountsFromText(plainText);
    const featureNames = extractFeatureNamesFromDescriptionText(plainText);
    const { features, customFeatures } = mapRoomFeatureNames(featureNames);

    rooms.push({
      roomType: "yatak_odasi",
      name: String(sortOrder),
      singleBeds,
      doubleBeds,
      imageUrl: "",
      features,
      customFeatures,
      sortOrder,
    });
  }

  return rooms.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveMappedVillaRooms(
  property: Pick<TatildeyizProperty, "PropertyRooms" | "description">
): {
  rooms: MappedVillaRoom[];
  source: "PropertyRooms" | "description" | null;
} {
  const structuredRooms = mapTatildeyizPropertyRooms(property);
  if (structuredRooms.length > 0) {
    return { rooms: structuredRooms, source: "PropertyRooms" };
  }

  const parsedRooms = parseBedroomSectionsFromDescription(property.description);
  if (parsedRooms.length > 0) {
    return { rooms: parsedRooms, source: "description" };
  }

  return { rooms: [], source: null };
}

export function villaRoomsAlreadyDetailed(
  rooms: Array<{
    singleBeds: number;
    doubleBeds: number;
    features: string[];
    customFeatures: string[];
  }>
) {
  return rooms.some(
    (room) =>
      room.singleBeds > 0 ||
      room.doubleBeds > 0 ||
      room.features.length > 0 ||
      room.customFeatures.length > 0
  );
}

export async function applyTatildeyizRoomsToVilla(
  prisma: PrismaClient,
  slug: string,
  options: {
    dryRun?: boolean;
    force?: boolean;
    property?: TatildeyizProperty;
  } = {}
): Promise<ImportVillaRoomsResult> {
  const { dryRun = false, force = false } = options;

  const villa = await prisma.villa.findUnique({
    where: { slug },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      bedrooms: true,
    },
  });

  if (!villa) {
    return { slug, status: "error", error: "Villa veritabanında bulunamadı" };
  }

  const property =
    options.property ?? (await fetchTatildeyizPropertyWithDelay(slug));
  const { rooms: mappedRooms, source } = resolveMappedVillaRooms(property);

  if (mappedRooms.length === 0 || !source) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "error",
      sourceRoomCount: 0,
      error: "Tatildeyiz oda verisi bulunamadı (PropertyRooms ve açıklama boş)",
    };
  }

  const existingRooms = dryRun
    ? await prisma.villaRoom.findMany({
        where: { villaId: villa.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
    : await syncVillaRooms(villa.id);

  if (!force && villaRoomsAlreadyDetailed(existingRooms)) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "skipped",
      sourceRoomCount: mappedRooms.length,
      source,
      error: "Odalar zaten dolu (--force ile yeniden yazılabilir)",
    };
  }

  const targetCount = Math.min(mappedRooms.length, existingRooms.length);
  const roomsToApply = mappedRooms.slice(0, targetCount);

  if (dryRun) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "success",
      sourceRoomCount: mappedRooms.length,
      updatedRoomCount: roomsToApply.length,
      source,
      rooms: roomsToApply,
    };
  }

  for (let index = 0; index < roomsToApply.length; index += 1) {
    const mapped = roomsToApply[index];
    const existing = existingRooms[index];
    if (!existing || !mapped) continue;

    await prisma.villaRoom.update({
      where: { id: existing.id },
      data: {
        roomType: mapped.roomType,
        name: mapped.name,
        singleBeds: mapped.singleBeds,
        doubleBeds: mapped.doubleBeds,
        imageUrl: mapped.imageUrl,
        features: mapped.features,
        customFeatures: mapped.customFeatures,
        sortOrder: mapped.sortOrder,
      },
    });
  }

  await syncVillaRoomFeatureCatalog(villa.id);

  return {
    slug,
    villaId: villa.id,
    dbVillaId: villa.villaId,
    name: villa.name,
    status: "success",
    sourceRoomCount: mappedRooms.length,
    updatedRoomCount: roomsToApply.length,
    source,
    rooms: roomsToApply,
  };
}
