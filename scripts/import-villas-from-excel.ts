import {
  PrismaClient,
  RegionLevel,
  SalesType,
  VillaCategory,
  type Villa,
} from "@prisma/client";
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  readTesislerSheet,
  resolveVillaAmenitiesFromExcelRow,
  type ExcelRow,
} from "../lib/villa-excel-amenities";

const EXCEL_PATH =
  process.argv[2] ??
  "c:/Users/BARAN/Downloads/Tüm Villalar Aktif - Pasif.xlsx";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80";

const REGION_ALIASES: Record<string, string> = {
  "dalyan, mugla": "Dalyan",
  "mugla, fethiye": "Fethiye",
  "mugla, seydikemer": "Seydikemer",
  "seydikemer, mugla": "Seydikemer",
};

type ImportError = {
  row: number;
  id: string;
  slug: string;
  name: string;
  reason: string;
};

type ImportStats = {
  created: number;
  updated: number;
  active: number;
  passive: number;
  fallbackRegion: number;
};

const prisma = new PrismaClient();

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBool(value: unknown): boolean {
  const text = cleanText(value).toLocaleLowerCase("tr-TR");
  return text === "evet" || text === "true" || text === "1";
}

function parseIntField(value: unknown, fallback = 0): number {
  const parsed = parseInt(cleanText(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTatildeyizId(value: unknown): number | null {
  const parsed = parseInt(cleanText(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseExcelTime(value: unknown, fallback: string): string {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const text = cleanText(value);
  if (/^\d{1,2}:\d{2}$/.test(text)) return text;
  return fallback;
}

function parseCategory(value: unknown): VillaCategory {
  const text = cleanText(value).toLocaleLowerCase("tr-TR");
  if (text.includes("apart")) return VillaCategory.apart;
  if (text.includes("suit")) return VillaCategory.suit_daire;
  return VillaCategory.villa;
}

function parseSalesType(value: unknown): SalesType {
  const text = cleanText(value).toLocaleLowerCase("tr-TR");
  return text === "garanti" ? SalesType.garanti : SalesType.komisyon;
}

function parseActive(value: unknown): boolean {
  return parseBool(value);
}

function normalizeKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveSlug(
  rawSlug: string,
  name: string,
  tatildeyizId: number | null,
  rowNumber: number
): string {
  const fromExcel = slugify(rawSlug);
  if (fromExcel) return fromExcel;

  const fromName = slugify(name);
  if (fromName) return fromName;

  if (tatildeyizId != null) return `villa-${tatildeyizId}`;
  return `villa-${rowNumber}`;
}

function resolveBolgeCandidates(bolge: string): string[] {
  const trimmed = cleanText(bolge);
  if (!trimmed) return [];

  const candidates = [trimmed];
  const alias = REGION_ALIASES[normalizeKey(trimmed)];
  if (alias) candidates.push(alias);

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((part) => cleanText(part)).filter(Boolean);
    candidates.push(...parts);
  }

  return [...new Set(candidates)];
}

function findRegionId(
  bolge: string,
  regionByName: Map<string, string>,
  fallbackRegionId: string
): { regionId: string; usedFallback: boolean } {
  const trimmed = cleanText(bolge);
  if (!trimmed) {
    return { regionId: fallbackRegionId, usedFallback: true };
  }

  for (const candidate of resolveBolgeCandidates(bolge)) {
    const direct =
      regionByName.get(candidate) ??
      regionByName.get(candidate.toLocaleLowerCase("tr-TR"));
    if (direct) return { regionId: direct, usedFallback: false };
  }

  return { regionId: fallbackRegionId, usedFallback: true };
}

type VillaExcelData = {
  tatildeyizId: number | null;
  slug: string;
  name: string;
  originalName: string;
  category: VillaCategory;
  salesType: SalesType;
  regionId: string;
  ownerId: string | null;
  location: string;
  guests: number;
  extraCapacity: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  amenities: string[];
  facilityCategories: string[];
  active: boolean;
  showInOffer: boolean;
  showInSearch: boolean;
  allowChildren: boolean;
  allowEvents: boolean;
  allowPets: boolean;
  allowSmoking: boolean;
  kbsReportable: boolean;
  onlinePayment: boolean;
  b2bSharing: boolean;
  documentNo: string;
  documentOwnerName: string;
  checkInTime: string;
  checkOutTime: string;
  greeterName: string;
  greeterPhone: string;
  calendarManagerName: string;
  calendarManagerPhone: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ribbonText1: string;
  ribbonText2: string;
  videoUrl: string;
  icalExportToken?: string;
  poolCount: number;
  poolInfo: string;
};

function buildVillaDataFromRow(
  row: ExcelRow,
  headers: string[],
  masterAmenities: Set<string>,
  masterFacilities: Set<string>,
  regionId: string,
  ownerId: string | null,
  slug: string
): VillaExcelData {
  const name = cleanText(row["Tesis Adı"]);
  const bolge = cleanText(row["Bölge"]);
  const { amenities, facilityCategories } = resolveVillaAmenitiesFromExcelRow(
    row,
    headers,
    masterAmenities,
    masterFacilities
  );
  const icalToken = cleanText(row["iCal Feed Token"]);

  return {
    tatildeyizId: parseTatildeyizId(row.ID),
    slug,
    name,
    originalName: cleanText(row["Orjinal Adı"]),
    category: parseCategory(row["Tesis Tipi"]),
    salesType: parseSalesType(row["Satış Tipi"]),
    regionId,
    ownerId,
    location: bolge || name,
    guests: Math.max(1, parseIntField(row.Kapasite, 2)),
    extraCapacity: parseIntField(row["Ek Kapasite"]),
    bedrooms: Math.max(1, parseIntField(row["Yatak Odası"], 1)),
    bathrooms: Math.max(1, parseIntField(row.Banyo, 1)),
    description: cleanText(row.Açıklama) || name,
    amenities,
    facilityCategories,
    active: parseActive(row.Listede),
    showInOffer: parseBool(row["Teklif Listesinde"]),
    showInSearch: parseBool(row["Arama Listesinde"]),
    allowChildren: parseBool(row["Çocuk İzni"]) || !row["Çocuk İzni"],
    allowEvents: parseBool(row["Etkinlik İzni"]),
    allowPets: parseBool(row["Evcil Hayvan"]),
    allowSmoking: parseBool(row["Sigara İzni"]),
    kbsReportable: parseBool(row["KBS Bildirim"]),
    onlinePayment: parseBool(row["Direkt Satış"]),
    b2bSharing: parseBool(row["B2B Paylaşım"]),
    documentNo: cleanText(row["Belge No"]),
    documentOwnerName: cleanText(row["Belge Sahibi"]),
    checkInTime: parseExcelTime(row["Giriş Saati"], "16:00"),
    checkOutTime: parseExcelTime(row["Çıkış Saati"], "10:00"),
    greeterName: cleanText(row["Host Adı"]),
    greeterPhone:
      cleanText(row["Host Tel 1"]) || cleanText(row["Host Tel 2"]),
    calendarManagerName: cleanText(row["Host Adı"]),
    calendarManagerPhone:
      cleanText(row["Host Tel 1"]) || cleanText(row["Host Tel 2"]),
    seoTitle: cleanText(row["SEO Başlık"]),
    seoDescription: cleanText(row["SEO Açıklama"]),
    seoKeywords: cleanText(row["SEO Anahtar Kelimeler"]),
    ribbonText1: cleanText(row["Etiket 1"]),
    ribbonText2: cleanText(row["Etiket 2"]),
    videoUrl: cleanText(row["Video URL"]),
    icalExportToken: icalToken || undefined,
    poolCount: parseIntField(row["Havuz Sayısı"]),
    poolInfo: cleanText(row["Havuz Bilgisi"]),
  };
}

function toCreateData(data: VillaExcelData) {
  return {
    tatildeyizId: data.tatildeyizId,
    slug: data.slug,
    name: data.name,
    originalName: data.originalName,
    category: data.category,
    salesType: data.salesType,
    regionId: data.regionId,
    ownerId: data.ownerId,
    location: data.location,
    guests: data.guests,
    extraCapacity: data.extraCapacity,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    livingRooms: 1,
    pricePerNight: null,
    image: DEFAULT_IMAGE,
    images: [DEFAULT_IMAGE],
    description: data.description,
    amenities: data.amenities,
    facilityCategories: data.facilityCategories,
    active: data.active,
    showInOffer: data.showInOffer,
    showInSearch: data.showInSearch,
    allowChildren: data.allowChildren,
    allowEvents: data.allowEvents,
    allowPets: data.allowPets,
    allowSmoking: data.allowSmoking,
    kbsReportable: data.kbsReportable,
    onlinePayment: data.onlinePayment,
    b2bSharing: data.b2bSharing,
    documentNo: data.documentNo,
    documentOwnerName: data.documentOwnerName,
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime,
    greeterName: data.greeterName,
    greeterPhone: data.greeterPhone,
    calendarManagerName: data.calendarManagerName,
    calendarManagerPhone: data.calendarManagerPhone,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    seoKeywords: data.seoKeywords,
    ribbonText1: data.ribbonText1,
    ribbonText2: data.ribbonText2,
    videoUrl: data.videoUrl,
    icalExportToken: data.icalExportToken,
    whatsappGroupId: "",
  };
}

function toUpdateData(data: VillaExcelData, existing: Villa) {
  const update: Record<string, unknown> = {
    tatildeyizId: data.tatildeyizId,
    name: data.name,
    originalName: data.originalName,
    category: data.category,
    salesType: data.salesType,
    regionId: data.regionId,
    ownerId: data.ownerId,
    location: data.location,
    guests: data.guests,
    extraCapacity: data.extraCapacity,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    description: data.description,
    amenities: data.amenities,
    facilityCategories: data.facilityCategories,
    active: data.active,
    showInOffer: data.showInOffer,
    showInSearch: data.showInSearch,
    allowChildren: data.allowChildren,
    allowEvents: data.allowEvents,
    allowPets: data.allowPets,
    allowSmoking: data.allowSmoking,
    kbsReportable: data.kbsReportable,
    onlinePayment: data.onlinePayment,
    b2bSharing: data.b2bSharing,
    documentNo: data.documentNo,
    documentOwnerName: data.documentOwnerName,
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime,
    greeterName: data.greeterName,
    greeterPhone: data.greeterPhone,
    calendarManagerName: data.calendarManagerName,
    calendarManagerPhone: data.calendarManagerPhone,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    seoKeywords: data.seoKeywords,
    ribbonText1: data.ribbonText1,
    ribbonText2: data.ribbonText2,
    videoUrl: data.videoUrl,
  };

  if (data.slug !== existing.slug) {
    update.slug = data.slug;
  }
  if (data.icalExportToken) {
    update.icalExportToken = data.icalExportToken;
  }

  return update;
}

async function syncPoolFromExcel(
  villaId: string,
  poolCount: number,
  poolInfo: string,
  existingPoolCount: number
) {
  if (poolCount <= 0 || existingPoolCount > 0) return;

  await prisma.villaPool.create({
    data: {
      villaId,
      poolType: poolInfo || "Özel Havuz",
      sortOrder: 0,
    },
  });
}

async function main() {
  const { sheetName, headers, rows } = readTesislerSheet(EXCEL_PATH);

  const masterAmenities = new Set(
    (await prisma.amenity.findMany({ select: { name: true } })).map(
      (item) => item.name
    )
  );
  const masterFacilities = new Set(
    (await prisma.facilityCategory.findMany({ select: { name: true } })).map(
      (item) => item.name
    )
  );

  const regions = await prisma.region.findMany({
    where: {
      active: true,
      level: { in: [RegionLevel.MAHALLE, RegionLevel.ILCE, RegionLevel.IL] },
    },
    select: { id: true, name: true, slug: true, level: true },
    orderBy: [{ level: "asc" }],
  });

  const regionByName = new Map<string, string>();
  for (const region of regions) {
    if (!regionByName.has(region.name)) {
      regionByName.set(region.name, region.id);
      regionByName.set(region.name.toLocaleLowerCase("tr-TR"), region.id);
    }
  }

  const fallbackRegionId =
    regionByName.get("Fethiye") ??
    regionByName.get("Muğla") ??
    regions[0]?.id;

  if (!fallbackRegionId) {
    throw new Error("Varsayılan bölge bulunamadı");
  }

  const existingVillas = await prisma.villa.findMany({
    select: {
      id: true,
      slug: true,
      tatildeyizId: true,
      _count: { select: { pools: true } },
    },
  });

  const villaByTatildeyizId = new Map<number, (typeof existingVillas)[number]>();
  const villaBySlug = new Map<string, (typeof existingVillas)[number]>();
  for (const villa of existingVillas) {
    if (villa.tatildeyizId != null) {
      villaByTatildeyizId.set(villa.tatildeyizId, villa);
    }
    villaBySlug.set(villa.slug, villa);
  }

  const beforeVillas = existingVillas.length;

  console.log(`Excel: ${rows.length} satır (${sheetName})`);
  console.log(`Mevcut: ${beforeVillas} villa`);
  console.log("Upsert modu: mevcut villalar korunur (tatildeyizId / slug ile eşleştirme)");

  const errors: ImportError[] = [];
  const stats: ImportStats = {
    created: 0,
    updated: 0,
    active: 0,
    passive: 0,
    fallbackRegion: 0,
  };
  const usedSlugs = new Set(existingVillas.map((villa) => villa.slug));
  const ownerCache = new Map<string, string>();

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const externalId = cleanText(row.ID);
    const name = cleanText(row["Tesis Adı"]);
    const tatildeyizId = parseTatildeyizId(row.ID);
    let slug = resolveSlug(
      cleanText(row.Slug),
      name,
      tatildeyizId,
      rowNumber
    );
    const bolge = cleanText(row["Bölge"]);

    if (!name && !slug) continue;

    let existing =
      (tatildeyizId != null ? villaByTatildeyizId.get(tatildeyizId) : null) ??
      villaBySlug.get(slug) ??
      null;

    if (!existing && usedSlugs.has(slug)) {
      slug = `${slug}-${externalId || rowNumber}`;
    }
    usedSlugs.add(slug);

    const { regionId, usedFallback } = findRegionId(
      bolge,
      regionByName,
      fallbackRegionId
    );
    if (usedFallback) {
      stats.fallbackRegion += 1;
    }

    const ownerName = cleanText(row["Ev Sahibi Adı"]);
    const ownerPhone = cleanText(row["Ev Sahibi Telefon"]);
    let ownerId: string | null = null;

    if (ownerName) {
      const ownerKey = `${ownerName}|${ownerPhone}`;
      const cachedOwnerId = ownerCache.get(ownerKey);
      if (cachedOwnerId) {
        ownerId = cachedOwnerId;
      } else {
        const existingOwner = await prisma.villaOwner.findFirst({
          where: {
            name: ownerName,
            phone: ownerPhone || undefined,
          },
          select: { id: true },
        });

        if (existingOwner) {
          ownerId = existingOwner.id;
        } else {
          const createdOwner = await prisma.villaOwner.create({
            data: {
              name: ownerName,
              firstName: ownerName.split(" ")[0] ?? ownerName,
              lastName: ownerName.split(" ").slice(1).join(" "),
              phone: ownerPhone,
            },
          });
          ownerId = createdOwner.id;
        }
        ownerCache.set(ownerKey, ownerId);
      }
    }

    const villaData = buildVillaDataFromRow(
      row,
      headers,
      masterAmenities,
      masterFacilities,
      regionId,
      ownerId,
      slug
    );

    try {
      if (existing) {
        const fullExisting = await prisma.villa.findUniqueOrThrow({
          where: { id: existing.id },
        });

        const updateData = toUpdateData(villaData, fullExisting);
        const slugOwner = villaBySlug.get(villaData.slug);
        if (
          slugOwner &&
          slugOwner.id !== existing.id &&
          updateData.slug === villaData.slug
        ) {
          delete updateData.slug;
        }

        const updated = await prisma.villa.update({
          where: { id: existing.id },
          data: updateData,
        });

        await syncPoolFromExcel(
          updated.id,
          villaData.poolCount,
          villaData.poolInfo,
          existing._count.pools
        );

        if (updated.slug !== existing.slug) {
          villaBySlug.delete(existing.slug);
          villaBySlug.set(updated.slug, {
            ...existing,
            slug: updated.slug,
            tatildeyizId: updated.tatildeyizId,
          });
        }

        if (updated.tatildeyizId != null) {
          villaByTatildeyizId.set(updated.tatildeyizId, {
            ...existing,
            slug: updated.slug,
            tatildeyizId: updated.tatildeyizId,
          });
        }

        stats.updated += 1;
      } else {
        const created = await prisma.villa.create({
          data: toCreateData(villaData),
        });

        await syncPoolFromExcel(
          created.id,
          villaData.poolCount,
          villaData.poolInfo,
          0
        );

        const tracked = {
          id: created.id,
          slug: created.slug,
          tatildeyizId: created.tatildeyizId,
          _count: { pools: villaData.poolCount > 0 ? 1 : 0 },
        };
        villaBySlug.set(created.slug, tracked);
        if (created.tatildeyizId != null) {
          villaByTatildeyizId.set(created.tatildeyizId, tracked);
        }

        stats.created += 1;
      }

      if (villaData.active) {
        stats.active += 1;
      } else {
        stats.passive += 1;
      }

      const processed = stats.created + stats.updated;
      if (processed % 100 === 0) {
        console.log(`  ${processed} villa işlendi...`);
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        id: externalId,
        slug,
        name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const afterVillas = await prisma.villa.count();
  const activeInDb = await prisma.villa.count({ where: { active: true } });
  const passiveInDb = await prisma.villa.count({ where: { active: false } });
  const successCount = stats.created + stats.updated;
  const reportPath = resolve("scripts/import-villas-report.json");
  const report = {
    importedAt: new Date().toISOString(),
    excelPath: EXCEL_PATH,
    sheetName,
    totalRows: rows.length,
    successCount,
    createdCount: stats.created,
    updatedCount: stats.updated,
    activeCount: stats.active,
    passiveCount: stats.passive,
    errorCount: errors.length,
    beforeVillaCount: beforeVillas,
    finalVillaCount: afterVillas,
    activeInDb,
    passiveInDb,
    fallbackRegionCount: stats.fallbackRegion,
    errors,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== İçe Aktarma Özeti ===");
  console.log(`Toplam işlenen: ${successCount}`);
  console.log(`  Yeni oluşturulan: ${stats.created}`);
  console.log(`  Güncellenen: ${stats.updated}`);
  console.log(`  Aktif (Listede=Evet): ${stats.active}`);
  console.log(`  Pasif (Listede=Hayır): ${stats.passive}`);
  console.log(`  Varsayılan bölge kullanılan: ${stats.fallbackRegion}`);
  console.log(`Hatalı: ${errors.length}`);
  console.log(`Sistemdeki villa sayısı: ${afterVillas} (aktif: ${activeInDb}, pasif: ${passiveInDb})`);
  console.log(`Rapor: ${reportPath}`);

  if (errors.length > 0) {
    console.log("\nİlk 20 hata:");
    for (const item of errors.slice(0, 20)) {
      console.log(
        `  Satır ${item.row} | ${item.name} (${item.slug}) | ${item.reason}`
      );
    }
  }
}

main()
  .catch((error) => {
    console.error("İçe aktarma başarısız:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
