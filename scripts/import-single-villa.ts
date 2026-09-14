import {
  readTesislerSheet,
  resolveVillaAmenitiesFromExcelRow,
} from "../lib/villa-excel-amenities";
import {
  PrismaClient,
  RegionLevel,
  SalesType,
  VillaCategory,
} from "@prisma/client";

const SLUG = process.argv[2] ?? "villa-olive";
const EXCEL_PATH =
  "c:/Users/BARAN/Downloads/tesis-raporu-2026-07-04.xlsx";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80";

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

async function main() {
  const existing = await prisma.villa.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log(`Zaten mevcut: ${existing.name} (${SLUG})`);
    return;
  }

  const { headers, rows } = readTesislerSheet(EXCEL_PATH);
  const row = rows.find(
    (item) => cleanText(item.Slug).toLocaleLowerCase("tr-TR") === SLUG
  );

  if (!row) {
    throw new Error(`Excel'de ${SLUG} bulunamadı`);
  }

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
  const { amenities, facilityCategories } = resolveVillaAmenitiesFromExcelRow(
    row,
    headers,
    masterAmenities,
    masterFacilities
  );

  const bolge = cleanText(row["Bölge"]);
  const region = await prisma.region.findFirst({
    where: {
      active: true,
      name: { equals: bolge, mode: "insensitive" },
      level: { in: [RegionLevel.MAHALLE, RegionLevel.ILCE] },
    },
    select: { id: true, name: true, level: true },
  });

  if (!region) {
    throw new Error(`Bölge bulunamadı: "${bolge}"`);
  }

  const ownerName = cleanText(row["Ev Sahibi Adı"]);
  const ownerPhone = cleanText(row["Ev Sahibi Telefon"]);
  let ownerId: string | null = null;

  if (ownerName) {
    const owner =
      (await prisma.villaOwner.findFirst({
        where: { name: ownerName, phone: ownerPhone || undefined },
        select: { id: true },
      })) ??
      (await prisma.villaOwner.create({
        data: {
          name: ownerName,
          firstName: ownerName.split(" ")[0] ?? ownerName,
          lastName: ownerName.split(" ").slice(1).join(" "),
          phone: ownerPhone,
        },
        select: { id: true },
      }));
    ownerId = owner.id;
  }

  const villa = await prisma.villa.create({
    data: {
      slug: SLUG,
      name: cleanText(row["Tesis Adı"]),
      originalName: cleanText(row["Orjinal Adı"]),
      category: parseCategory(row["Tesis Tipi"]),
      salesType: parseSalesType(row["Satış Tipi"]),
      regionId: region.id,
      ownerId,
      location: bolge,
      guests: Math.max(1, parseIntField(row.Kapasite, 2)),
      extraCapacity: parseIntField(row["Ek Kapasite"]),
      bedrooms: Math.max(1, parseIntField(row["Yatak Odası"], 1)),
      bathrooms: Math.max(1, parseIntField(row.Banyo, 1)),
      livingRooms: 1,
      image: DEFAULT_IMAGE,
      images: [DEFAULT_IMAGE],
      description: cleanText(row.Açıklama) || cleanText(row["Tesis Adı"]),
      amenities,
      facilityCategories,
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

  console.log(
    `Eklendi: ${villa.name} (${villa.slug}) -> ${region.name} (${region.level})`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
