/**
 * Villa Patara Adonis 1–4:
 * - Adonis 4 galeri: villadenizi.com.tr
 * - Link 1: kastavillam.com (takvim + fiyat)
 * - Özellikler: kastavillam amanities (+ Adonis 4 için villadenizi features)
 *
 *   npx tsx scripts/setup-villa-adonis-kastavillam.ts
 *   npx tsx scripts/setup-villa-adonis-kastavillam.ts --dry-run
 *   npx tsx scripts/setup-villa-adonis-kastavillam.ts --skip-gallery
 *   npx tsx scripts/setup-villa-adonis-kastavillam.ts --skip-sync
 */
import { prisma } from "../lib/db";
import {
  mergeFacilityCategoryNames,
  resolveFacilityCategoryNamesForAmenities,
} from "../lib/amenity-facility-links";
import { importVillaGalleryFromUrls } from "../lib/external-villa-gallery-import";
import { parsePlatoMacrovillaListing } from "../lib/external-villa-listing";
import { getAmenitiesForVillaForm } from "../lib/queries/amenities";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const VILLADENIZI_ADONIS_4 =
  "https://www.villadenizi.com.tr/villa/villa-adonis-4";

const TARGETS = [
  {
    slug: "villa-patara-adonis-1",
    name: "Villa Patara Adonis 1",
    link1: "https://www.kastavillam.com/villa-adonis-1/",
    importGalleryFromVilladenizi: false,
  },
  {
    slug: "villa-patara-adonis-2",
    name: "Villa Patara Adonis 2",
    link1: "https://www.kastavillam.com/villa-adonis-2/",
    importGalleryFromVilladenizi: false,
  },
  {
    slug: "villa-patara-adonis-3",
    name: "Villa Patara Adonis 3",
    link1: "https://www.kastavillam.com/villa-adonis-3/",
    importGalleryFromVilladenizi: false,
  },
  {
    slug: "villa-patara-adonis-4",
    name: "Villa Patara Adonis 4",
    link1: "https://www.kastavillam.com/villa-adonis-4/",
    importGalleryFromVilladenizi: true,
  },
] as const;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
};

const AMENITY_ALIASES: Record<string, string> = {
  "ücretsiz wifi": "Wi-Fi",
  wifi: "Wi-Fi",
  "microdalga fırın": "Mikrodalga",
  "mikrodalga fırın": "Mikrodalga",
  televizyon: "Düz ekran TV",
  tv: "Düz ekran TV",
  "lcd tv": "Düz ekran TV",
  "özel havuz": "Özel Havuzlu",
  "özel bahçe": "Bahçe",
  "özel otopark": "Otopark",
  "saç kurutma makinesi": "Saç Kurutma Makinesi",
  "ütü ve gereçleri": "Ütü",
  ütü: "Ütü",
  "havlular ve çarşaflar": "Havlu ve Nevresim",
  "mutfak gereçleri": "Mutfak Gereçleri",
  "açık hava mobilyaları": "Bahçe Mobilyası",
  "havuz ve bahçe bakımı": "Havuz Bakımı",
  "sigara içilmeyen odalar": "Sigara İçilmez",
  "engelli konuklar için uygun": "Engelli Dostu",
  "denize platform": "Denize Sıfır",
  "bebek yatağı": "Bebek Yatağı",
  "mama sandalyesi": "Mama Sandalyesi",
  "kahve makinesi": "Kahve Makinesi",
  "çamaşır makinesi": "Çamaşır Makinesi",
  "bulaşık makinesi": "Bulaşık makinesi",
  "amerikan mutfak": "Amerikan Mutfak",
  şemsiye: "Şemsiye",
  şezlong: "Şezlong",
  salıncak: "Salıncak",
  jakuzi: "Jakuzi",
  barbekü: "Barbekü",
  fırın: "Fırın",
  buzdolabı: "Buzdolabı",
  klima: "Klima",
  "deniz manzarası": "Deniz Manzarası",
};

function amenityKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      Referer: new URL(url).origin + "/",
    },
  });
  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status}): ${url}`);
  }
  return response.text();
}

function extractKastavillamAmenities(html: string): string[] {
  const match = html.match(/<div class="amanities">\s*<ul>([\s\S]*?)<\/ul>/i);
  if (!match?.[1]) return [];
  return [
    ...new Set(
      [...match[1].matchAll(/<li[^>]*>[\s\S]*?<\/li>/gi)]
        .map((item) =>
          item[0]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter(Boolean)
    ),
  ];
}

function extractKastavillamGuests(html: string): number | null {
  const match = html.match(/(\d+)\s*Ki[sş]i/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractKastavillamGalleryUrls(html: string): string[] {
  return [
    ...new Set(
      [
        ...html.matchAll(
          /https:\/\/www\.kastavillam\.com\/upload\/catalog\/\d+\/1280\/[^"'\\\s]+\.jpe?g/gi
        ),
      ].map((m) => m[0])
    ),
  ];
}

function resolveAmenityNames(
  labels: string[],
  catalog: Map<string, string>
): string[] {
  const out = new Set<string>();
  for (const raw of labels) {
    const key = amenityKey(raw);
    const aliased = AMENITY_ALIASES[key] ?? raw.trim();
    const exact = catalog.get(amenityKey(aliased));
    if (exact) {
      out.add(exact);
      continue;
    }
    for (const [catalogKey, catalogName] of catalog) {
      if (
        catalogKey === amenityKey(aliased) ||
        catalogKey.includes(amenityKey(aliased)) ||
        amenityKey(aliased).includes(catalogKey)
      ) {
        out.add(catalogName);
      }
    }
  }
  return [...out];
}

async function applyFeatures(params: {
  villaId: string;
  amenityLabels: string[];
  facilityLabels: string[];
  guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  documentNo: string | null;
  descriptionHtml: string | null;
  latitude: number | null;
  longitude: number | null;
  dryRun: boolean;
}) {
  const categories = await getAmenitiesForVillaForm();
  const catalog = new Map(
    categories.flatMap((category) =>
      category.amenities
        .filter((item) => item.active)
        .map((item) => [amenityKey(item.name), item.name] as const)
    )
  );
  const amenities = resolveAmenityNames(params.amenityLabels, catalog);
  const linked = await resolveFacilityCategoryNamesForAmenities(amenities);
  const facilityCategories = mergeFacilityCategoryNames(
    params.facilityLabels,
    linked
  );

  const data: Record<string, unknown> = {
    amenities,
    facilityCategories,
  };
  if (params.guests != null) data.guests = params.guests;
  if (params.bedrooms != null) data.bedrooms = params.bedrooms;
  if (params.bathrooms != null) data.bathrooms = params.bathrooms;
  if (params.documentNo) data.documentNo = params.documentNo;
  if (params.descriptionHtml) data.description = params.descriptionHtml;
  if (params.latitude != null && params.latitude !== 0) {
    data.latitude = params.latitude;
  }
  if (params.longitude != null && params.longitude !== 0) {
    data.longitude = params.longitude;
  }

  if (!params.dryRun) {
    await prisma.villa.update({
      where: { id: params.villaId },
      data,
    });
  }

  return {
    amenityCount: amenities.length,
    facilityCount: facilityCategories.length,
    amenities,
    facilityCategories,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const skipGallery = process.argv.includes("--skip-gallery");
  const skipSync = process.argv.includes("--skip-sync");

  let villadeniziListing: ReturnType<typeof parsePlatoMacrovillaListing> = null;
  let villadeniziHtml = "";
  try {
    villadeniziHtml = await fetchHtml(VILLADENIZI_ADONIS_4);
    villadeniziListing = parsePlatoMacrovillaListing(
      VILLADENIZI_ADONIS_4,
      villadeniziHtml
    );
  } catch (error) {
    console.warn(
      "villadenizi okunamadı:",
      error instanceof Error ? error.message : error
    );
  }

  for (const target of TARGETS) {
    const villa = await prisma.villa.findFirst({
      where: {
        OR: [
          { slug: target.slug },
          { name: { equals: target.name, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        villaId: true,
        name: true,
        slug: true,
        images: true,
        amenities: true,
        externalSyncUrl1: true,
        guests: true,
        bedrooms: true,
        bathrooms: true,
        documentNo: true,
      },
    });
    if (!villa) {
      console.error("Villa bulunamadı:", target.slug);
      continue;
    }

    console.log("\n====", villa.name, `#${villa.villaId}`, "====");

    const kastaHtml = await fetchHtml(target.link1);
    const kastaAmenities = extractKastavillamAmenities(kastaHtml);
    const kastaGuests = extractKastavillamGuests(kastaHtml);
    const kastaGallery = extractKastavillamGalleryUrls(kastaHtml);

    const amenityLabels = [
      ...kastaAmenities,
      ...(target.importGalleryFromVilladenizi
        ? villadeniziListing?.amenityLabels ?? []
        : []),
    ];
    const facilityLabels = [
      ...(target.importGalleryFromVilladenizi
        ? villadeniziListing?.facilityLabels ?? []
        : []),
    ];
    if (/özel havuz/i.test(amenityLabels.join(" | "))) {
      facilityLabels.push("Havuzlu Villalar");
    }
    if (/jakuzi/i.test(amenityLabels.join(" | "))) {
      facilityLabels.push("Jakuzili Villalar");
    }
    if (/deniz/i.test(amenityLabels.join(" | "))) {
      facilityLabels.push("Denize Sıfır Villalar");
    }

    const featureResult = await applyFeatures({
      villaId: villa.id,
      amenityLabels,
      facilityLabels,
      guests:
        (target.importGalleryFromVilladenizi
          ? villadeniziListing?.guests
          : null) ??
        kastaGuests ??
        null,
      bedrooms:
        (target.importGalleryFromVilladenizi
          ? villadeniziListing?.bedrooms
          : null) ?? null,
      bathrooms:
        (target.importGalleryFromVilladenizi
          ? villadeniziListing?.bathrooms
          : null) ?? null,
      documentNo:
        (target.importGalleryFromVilladenizi
          ? villadeniziListing?.documentNo
          : null) || null,
      descriptionHtml:
        (target.importGalleryFromVilladenizi
          ? villadeniziListing?.descriptionHtml
          : null) || null,
      latitude:
        (target.importGalleryFromVilladenizi
          ? villadeniziListing?.latitude
          : null) ?? null,
      longitude:
        (target.importGalleryFromVilladenizi
          ? villadeniziListing?.longitude
          : null) ?? null,
      dryRun,
    });

    console.log(
      JSON.stringify(
        {
          features: featureResult,
          kastaAmenitySourceCount: kastaAmenities.length,
          kastaGalleryCount: kastaGallery.length,
          currentImages: villa.images.length,
          currentLink1: villa.externalSyncUrl1 || null,
          newLink1: target.link1,
        },
        null,
        2
      )
    );

    if (!skipGallery) {
      let galleryUrls: string[] = [];
      if (target.importGalleryFromVilladenizi) {
        galleryUrls = villadeniziListing?.imageUrls ?? [];
      } else if (villa.images.length <= 1 && kastaGallery.length > 0) {
        galleryUrls = kastaGallery;
      }

      if (galleryUrls.length > 0) {
        console.log(
          `Galeri import: ${galleryUrls.length} görsel${dryRun ? " (dry-run)" : ""}`
        );
        if (!dryRun) {
          const imported = await importVillaGalleryFromUrls(
            villa.id,
            galleryUrls,
            { force: true, delayMs: 150 }
          );
          console.log("Galeri OK", imported.importedCount, imported.localUrls[0]);
        }
      } else {
        console.log("Galeri atlandı (kaynak yok veya yeterli görsel var)");
      }
    }

    if (!dryRun) {
      const saved = await setVillaExternalSyncUrl(villa.id, 1, target.link1);
      if (!saved.ok) {
        console.error("Link 1 kaydı başarısız:", saved.message);
        continue;
      }
      console.log("Link 1 kaydedildi");
    }

    if (!skipSync && !dryRun) {
      await sleep(600);
      const sync = await syncVillaExternalLinkSlot(villa.id, 1, {
        urlOverride: target.link1,
      });
      console.log(sync.ok ? "SYNC OK" : "SYNC FAIL", sync.message);

      const after = await prisma.villa.findUnique({
        where: { id: villa.id },
        select: {
          externalSyncUrl1: true,
          externalSyncLastSyncedAt1: true,
          externalSyncLastMessage1: true,
          documentNo: true,
          guests: true,
          bedrooms: true,
          bathrooms: true,
          amenities: true,
          images: true,
          _count: { select: { pricePeriods: true, pricePeriodDays: true } },
        },
      });
      console.log(
        JSON.stringify(
          {
            link1: after?.externalSyncUrl1,
            lastSync: after?.externalSyncLastSyncedAt1,
            lastMessage: after?.externalSyncLastMessage1,
            documentNo: after?.documentNo,
            guests: after?.guests,
            bedrooms: after?.bedrooms,
            bathrooms: after?.bathrooms,
            amenityCount: after?.amenities.length,
            imageCount: after?.images.length,
            periods: after?._count.pricePeriods,
            days: after?._count.pricePeriodDays,
          },
          null,
          2
        )
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
