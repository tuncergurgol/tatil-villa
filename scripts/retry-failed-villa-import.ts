import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  PrismaClient,
  RegionLevel,
  SalesType,
  VillaCategory,
} from "@prisma/client";

const EXCEL_PATH =
  "c:/Users/BARAN/Downloads/tesis-raporu-2026-07-04.xlsx";
const REPORT_PATH = resolve("scripts/import-villas-report.json");
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80";

const REGION_ALIASES: Record<string, string> = {
  "dalyan, mugla": "Dalyan",
  "mugla, fethiye": "Fethiye",
  "mugla, seydikemer": "Seydikemer",
  "seydikemer, mugla": "Seydikemer",
};

type ExcelRow = Record<string, unknown>;

const prisma = new PrismaClient();

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function parseBool(value: unknown): boolean {
  const text = cleanText(value).toLocaleLowerCase("tr-TR");
  return text === "evet" || text === "true" || text === "1";
}

function parseIntField(value: unknown, fallback = 0): number {
  const parsed = parseInt(cleanText(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function collectTaggedValues(
  row: ExcelRow,
  headers: string[],
  startIndex: number
): string[] {
  const values: string[] = [];
  for (let index = startIndex; index < headers.length; index += 1) {
    const header = headers[index];
    if (!header) continue;
    if (parseBool(row[header])) values.push(header);
  }
  return values;
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
  regionByName: Map<string, string>
): string | null {
  for (const candidate of resolveBolgeCandidates(bolge)) {
    const direct =
      regionByName.get(candidate) ??
      regionByName.get(candidate.toLocaleLowerCase("tr-TR"));
    if (direct) return direct;
  }
  return null;
}

async function buildRegionMap() {
  const regions = await prisma.region.findMany({
    where: {
      active: true,
      level: { in: [RegionLevel.MAHALLE, RegionLevel.ILCE] },
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
  return regionByName;
}

async function main() {
  const previousReport = JSON.parse(readFileSync(REPORT_PATH, "utf8")) as {
    errors: { slug: string }[];
  };
  const failedSlugs = new Set(
    previousReport.errors.map((item) => item.slug).filter(Boolean)
  );

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets.Tesisler;
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: "" });
  const headers = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    range: 0,
  })[0];
  const amenityStartIndex = headers.findIndex((h) => h === "Banyo veya duş");
  const facilityStartIndex = headers.findIndex((h) => h === "Balayı Villası");
  const regionByName = await buildRegionMap();

  let successCount = 0;
  const stillFailed: { slug: string; name: string; reason: string }[] = [];
  const ownerCache = new Map<string, string>();

  for (const row of rows) {
    const slug = cleanText(row.Slug).toLocaleLowerCase("tr-TR");
    if (!failedSlugs.has(slug)) continue;

    const existing = await prisma.villa.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) continue;

    const name = cleanText(row["Tesis Adı"]);
    const bolge = cleanText(row["Bölge"]);
    const regionId = findRegionId(bolge, regionByName);

    if (!regionId) {
      stillFailed.push({
        slug,
        name,
        reason: `Bölge eşleşmedi: "${bolge}"`,
      });
      continue;
    }

    const ownerName = cleanText(row["Ev Sahibi Adı"]);
    const ownerPhone = cleanText(row["Ev Sahibi Telefon"]);
    let ownerId: string | null = null;

    if (ownerName) {
      const ownerKey = `${ownerName}|${ownerPhone}`;
      const cached = ownerCache.get(ownerKey);
      if (cached) {
        ownerId = cached;
      } else {
        const existingOwner = await prisma.villaOwner.findFirst({
          where: { name: ownerName, phone: ownerPhone || undefined },
          select: { id: true },
        });
        if (existingOwner) {
          ownerId = existingOwner.id;
        } else {
          const created = await prisma.villaOwner.create({
            data: {
              name: ownerName,
              firstName: ownerName.split(" ")[0] ?? ownerName,
              lastName: ownerName.split(" ").slice(1).join(" "),
              phone: ownerPhone,
            },
          });
          ownerId = created.id;
        }
        ownerCache.set(ownerKey, ownerId);
      }
    }

    try {
      const villa = await prisma.villa.create({
        data: {
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
          livingRooms: 1,
          image: DEFAULT_IMAGE,
          images: [DEFAULT_IMAGE],
          description: cleanText(row.Açıklama) || name,
          amenities:
            amenityStartIndex >= 0
              ? collectTaggedValues(row, headers, amenityStartIndex)
              : [],
          facilityCategories:
            facilityStartIndex >= 0
              ? collectTaggedValues(row, headers, facilityStartIndex)
              : [],
          active: parseBool(row.Listede) || !row.Listede,
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
          whatsappGroupId: "",
        },
      });

      if (parseIntField(row["Havuz Sayısı"]) > 0) {
        await prisma.villaPool.create({
          data: {
            villaId: villa.id,
            poolType: cleanText(row["Havuz Bilgisi"]) || "Özel Havuz",
            sortOrder: 0,
          },
        });
      }

      successCount += 1;
      console.log(`Eklendi: ${name} (${slug})`);
    } catch (error) {
      stillFailed.push({
        slug,
        name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const total = await prisma.villa.count();
  console.log(`\nEklenen: ${successCount}`);
  console.log(`Hâlâ hatalı: ${stillFailed.length}`);
  console.log(`Toplam villa: ${total}`);

  if (stillFailed.length > 0) {
    console.log("\nKalan hatalar:");
    for (const item of stillFailed) {
      console.log(`  ${item.name} (${item.slug}) | ${item.reason}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
