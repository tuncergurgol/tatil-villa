import { SalesType, VillaCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RegionLevel } from "@/lib/region-levels";
import {
  mergeFacilityCategoryNames,
  resolveFacilityCategoryNamesForAmenities,
} from "@/lib/amenity-facility-links";
import {
  getAmenitiesForVillaForm,
  getDefaultAmenityNames,
} from "@/lib/queries/amenities";
import { syncVillaRoomFeatureCatalog } from "@/lib/queries/villa-rooms";
import { importVillaGalleryFromUrls } from "@/lib/external-villa-gallery-import";
import { listGoogleDriveImageUrls } from "@/lib/google-drive-gallery";
import { importVillaPeriodsFromExternalPage } from "@/lib/external-villa-page-import-runner";
import {
  scrapeExternalVillaListing,
  type ExternalVillaListing,
  type ExternalVillaListingDistance,
  type ExternalVillaListingRoom,
} from "@/lib/external-villa-listing";
import { toSurroundingSlug } from "@/lib/surrounding-utils";
import {
  hasVillaTourismDocument,
  resolveVillaDocumentType,
} from "@/lib/villa-document-types";
import {
  allocateNextVillaId,
  assignMissingVillaNumericIds,
} from "@/lib/villa-numeric-id";
import { syncAmenitiesWithAllowPets } from "@/lib/villa-pets-amenity";
import {
  buildVillaSlugFromName,
  ensureUniqueVillaSlug,
} from "@/lib/villa-slug";
import { normalizeVillaDescriptionForStorage } from "@/lib/villa-html-content";
import { villaAdminEditPath } from "@/lib/villa-admin-path";

export type ExternalVillaSetupResult = {
  created: boolean;
  villaId: string;
  numericVillaId: number | null;
  name: string;
  slug: string;
  editPath: string;
  imageCount: number;
  distanceCount: number;
  periodCount: number;
  bookedDays: number;
  optionDays: number;
  roomCount: number;
  documentNo: string;
  link1: string;
  published: boolean;
  warnings: string[];
};

function normalizeUrl(value: string) {
  const parsed = new URL(value.trim());
  parsed.hash = "";
  const href = parsed.toString();
  return href.endsWith("/") ? href.slice(0, -1) : href;
}

function amenityKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

async function resolveMahalleRegionId(listing: ExternalVillaListing) {
  const nameCandidates = [
    listing.districtName?.trim(),
    ...String(listing.locationLabel || "")
      .split(/[/,|\-–—]/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 3),
  ].filter((value, index, all): value is string => {
    if (!value) return false;
    return (
      all.findIndex(
        (item) =>
          item &&
          item.toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR")
      ) === index
    );
  });

  let ilceFallbackId: string | null = null;

  for (const candidate of nameCandidates) {
    const district = await prisma.region.findFirst({
      where: {
        active: true,
        name: { equals: candidate, mode: "insensitive" },
        level: { in: [RegionLevel.ILCE, RegionLevel.MAHALLE] },
      },
      select: {
        id: true,
        name: true,
        level: true,
        image: true,
        slug: true,
        children: {
          where: { active: true, level: RegionLevel.MAHALLE },
          select: { id: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          take: 1,
        },
      },
    });

    if (district?.level === RegionLevel.MAHALLE) {
      return district.id;
    }

    if (district?.level === RegionLevel.ILCE && !ilceFallbackId) {
      if (district.children[0]?.id) {
        ilceFallbackId = district.children[0].id;
        continue;
      }

      const mahalleSlug = `${district.slug}-merkez`;
      const existingMahalle = await prisma.region.findUnique({
        where: { slug: mahalleSlug },
        select: { id: true, level: true },
      });
      if (existingMahalle?.level === RegionLevel.MAHALLE) {
        ilceFallbackId = existingMahalle.id;
        continue;
      }

      const created = await prisma.region.create({
        data: {
          slug: mahalleSlug,
          name: `${district.name} Merkez`,
          level: RegionLevel.MAHALLE,
          image: district.image,
          parentId: district.id,
          active: true,
          published: true,
          showInSearch: false,
        },
        select: { id: true },
      });
      ilceFallbackId = created.id;
    }
  }

  if (ilceFallbackId) return ilceFallbackId;

  const fallback = await prisma.region.findFirst({
    where: { level: RegionLevel.MAHALLE, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  if (!fallback) {
    throw new Error("Villa oluşturmak için aktif bir mahalle kaydı bulunamadı");
  }
  return fallback.id;
}

async function resolveAmenitiesAndFacilities(
  listing: ExternalVillaListing
) {
  const categories = await getAmenitiesForVillaForm();
  const catalog = new Map(
    categories.flatMap((category) =>
      category.amenities
        .filter((item) => item.active)
        .map((item) => [amenityKey(item.name), item.name] as const)
    )
  );
  const defaults = getDefaultAmenityNames(categories);
  const fromListing = listing.amenityLabels
    .map((label) => catalog.get(amenityKey(label)))
    .filter((name): name is string => Boolean(name));

  const amenities = syncAmenitiesWithAllowPets(
    [...new Set([...defaults, ...fromListing])],
    listing.allowPets
  );
  const linked = await resolveFacilityCategoryNamesForAmenities(amenities);
  const facilityCategories = mergeFacilityCategoryNames(
    listing.facilityLabels,
    linked
  );
  return { amenities, facilityCategories };
}

async function persistDistances(
  villaId: string,
  distances: ExternalVillaListingDistance[]
) {
  if (distances.length === 0) return 0;

  const [categories, locations] = await Promise.all([
    prisma.surroundingCategory.findMany({
      select: { id: true, name: true, slug: true },
    }),
    prisma.surroundingLocation.findMany({
      select: { id: true, name: true, categoryId: true },
    }),
  ]);
  const categoryBySlug = new Map(
    categories.map((item) => [item.slug, item] as const)
  );
  const locationBySlug = new Map(
    locations.map((item) => [toSurroundingSlug(item.name), item] as const)
  );

  const rows: { surroundingLocationId: string; distanceKm: number }[] = [];

  for (const distance of distances) {
    const categorySlug =
      toSurroundingSlug(distance.categoryName) || "yakin-yerler";
    let category = categoryBySlug.get(categorySlug);
    if (!category) {
      const maxOrder = await prisma.surroundingCategory.aggregate({
        _max: { sortOrder: true },
      });
      category = await prisma.surroundingCategory.create({
        data: {
          name: distance.categoryName,
          slug: categorySlug,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          active: true,
        },
        select: { id: true, name: true, slug: true },
      });
      categoryBySlug.set(categorySlug, category);
    }

    const locationSlug = toSurroundingSlug(distance.name);
    let location = locationBySlug.get(locationSlug);
    if (!location) {
      const maxOrder = await prisma.surroundingLocation.aggregate({
        where: { categoryId: category.id },
        _max: { sortOrder: true },
      });
      location = await prisma.surroundingLocation.create({
        data: {
          name: distance.name,
          categoryId: category.id,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          active: true,
        },
        select: { id: true, name: true, categoryId: true },
      });
      locationBySlug.set(locationSlug, location);
    }

    rows.push({
      surroundingLocationId: location.id,
      distanceKm: distance.distanceKm,
    });
  }

  const unique = new Map<string, number>();
  for (const row of rows) {
    unique.set(row.surroundingLocationId, row.distanceKm);
  }

  await prisma.villaSurroundingDistance.deleteMany({ where: { villaId } });
  await prisma.villaSurroundingDistance.createMany({
    data: [...unique.entries()].map(([surroundingLocationId, distanceKm]) => ({
      villaId,
      surroundingLocationId,
      distanceKm,
    })),
  });

  return unique.size;
}

async function persistPool(
  villaId: string,
  pool: ExternalVillaListing["pool"]
) {
  if (!pool) return;
  const existing = await prisma.villaPool.findFirst({
    where: { villaId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const data = {
    poolType: pool.poolType || "Özel Havuz",
    length: pool.length,
    width: pool.width,
    depth: pool.depth,
    conservative: pool.conservative,
    heated: pool.heated,
    measureUnit: "M" as const,
  };
  if (existing) {
    await prisma.villaPool.update({ where: { id: existing.id }, data });
    return;
  }
  await prisma.villaPool.create({
    data: {
      villaId,
      sortOrder: 0,
      ...data,
    },
  });
}

async function persistRooms(
  villaId: string,
  rooms: ExternalVillaListingRoom[]
) {
  await prisma.villaRoom.deleteMany({ where: { villaId } });

  if (rooms.length === 0) {
    // Yatak odası sayısı kadar boş oda iskeleti
    const villa = await prisma.villa.findUnique({
      where: { id: villaId },
      select: { bedrooms: true },
    });
    const count = Math.max(0, villa?.bedrooms ?? 0);
    if (count > 0) {
      await prisma.villaRoom.createMany({
        data: Array.from({ length: count }, (_, index) => ({
          villaId,
          roomType: "yatak_odasi",
          name: String(index + 1),
          sortOrder: index + 1,
        })),
      });
    }
    await syncVillaRoomFeatureCatalog(villaId);
    return count;
  }

  await prisma.villaRoom.createMany({
    data: rooms.map((room) => ({
      villaId,
      roomType: room.roomType,
      name: room.name,
      singleBeds: room.singleBeds,
      doubleBeds: room.doubleBeds,
      imageUrl: "",
      features: room.features,
      customFeatures: room.customFeatures,
      sortOrder: room.sortOrder,
    })),
  });
  await syncVillaRoomFeatureCatalog(villaId);
  // Kapak görseli galeri sırasının ilki olsun
  return rooms.length;
}

async function findExistingVilla(pageUrl: string, listing: ExternalVillaListing) {
  const byLink = await prisma.villa.findFirst({
    where: {
      OR: [
        { externalSyncUrl1: pageUrl },
        { externalSyncUrl2: pageUrl },
        { externalSyncUrl3: pageUrl },
        { externalSyncUrl4: pageUrl },
      ],
    },
    select: { id: true, villaId: true, name: true, slug: true },
  });
  if (byLink) return byLink;

  const slug = buildVillaSlugFromName(listing.name);
  return prisma.villa.findUnique({
    where: { slug },
    select: { id: true, villaId: true, name: true, slug: true },
  });
}

export async function setupVillaFromExternalUrl(
  pageUrlRaw: string,
  options?: {
    name?: string;
    publish?: boolean;
    /** Doluysa galeri Google Drive klasör/dosyasından alınır (kaynak site görselleri atlanır). */
    googleDriveUrl?: string;
  }
): Promise<ExternalVillaSetupResult> {
  const pageUrl = normalizeUrl(pageUrlRaw);
  const listing = await scrapeExternalVillaListing(pageUrl, {
    fallbackName: options?.name?.trim() || undefined,
    allowMinimalFallback: Boolean(
      options?.name?.trim() || options?.googleDriveUrl?.trim()
    ),
  });
  if (options?.name?.trim()) {
    listing.name = options.name.trim();
  }
  // scrape entityId eklediyse fiyat/takvim için zenginleştirilmiş URL kullan
  const syncUrl = normalizeUrl(listing.pageUrl || pageUrl);

  const warnings: string[] = [];
  try {
    const originalPath = new URL(pageUrl).pathname.replace(/\/+$/, "");
    const usedPath = new URL(listing.pageUrl).pathname.replace(/\/+$/, "");
    if (originalPath !== usedPath) {
      warnings.push(`Kaynak URL sitemap ile düzeltildi: ${listing.pageUrl}`);
    }
  } catch {
    // ignore
  }
  const googleDriveUrl = options?.googleDriveUrl?.trim() || "";
  if (googleDriveUrl) {
    const driveGallery = await listGoogleDriveImageUrls(googleDriveUrl);
    listing.imageUrls = driveGallery.urls;
    warnings.push(...driveGallery.warnings);
    warnings.push(
      `Galeri Google Drive'dan alındı (${driveGallery.source}, ${driveGallery.urls.length} görsel)`
    );
  }
  const regionId = await resolveMahalleRegionId(listing);
  const { amenities, facilityCategories } =
    await resolveAmenitiesAndFacilities(listing);
  const documentNo = listing.documentNo.trim();
  const documentType = resolveVillaDocumentType(documentNo, null);
  const publish = options?.publish ?? true;
  const documented = hasVillaTourismDocument({
    documentType,
    documentNo,
  });
  const visibility = {
    active: publish,
    showInSearch: publish && documented,
    showInOffer: true,
  };

  const existing = await findExistingVilla(syncUrl, listing);
  let created = false;
  let villaId: string;
  let numericVillaId: number | null;
  let slug: string;

  const sharedData = {
    name: listing.name,
    originalName: listing.originalName,
    category: VillaCategory.villa,
    regionId,
    location: listing.locationLabel,
    guests: listing.guests,
    extraCapacity: 0,
    livingRooms: listing.livingRooms,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    pricePerNight: listing.minNightlyPrice,
    description: normalizeVillaDescriptionForStorage(listing.descriptionHtml),
    amenities,
    facilityCategories,
    salesType: SalesType.komisyon,
    ribbonText1: listing.ribbonText1,
    documentNo,
    documentType,
    checkInTime: listing.checkInTime,
    checkOutTime: listing.checkOutTime,
    allowBaby: listing.allowBaby,
    allowChildren: listing.allowChildren,
    allowEvents: listing.allowEvents,
    allowSmoking: listing.allowSmoking,
    allowPets: listing.allowPets,
    latitude: listing.latitude,
    longitude: listing.longitude,
    externalSyncUrl1: syncUrl,
    ...visibility,
  };

  if (existing) {
    villaId = existing.id;
    numericVillaId = existing.villaId;
    slug = await ensureUniqueVillaSlug(
      buildVillaSlugFromName(listing.name),
      existing.id
    );
    await prisma.villa.update({
      where: { id: villaId },
      data: {
        ...sharedData,
        slug,
      },
    });
  } else {
    created = true;
    await assignMissingVillaNumericIds();
    const baseSlug = buildVillaSlugFromName(listing.name);
    slug = await ensureUniqueVillaSlug(baseSlug);
    const villa = await prisma.$transaction(async (tx) => {
      const nextVillaId = await allocateNextVillaId(tx);
      return tx.villa.create({
        data: {
          villaId: nextVillaId,
          slug,
          image: "",
          images: [],
          ...sharedData,
        },
        select: { id: true, villaId: true, slug: true },
      });
    });
    villaId = villa.id;
    numericVillaId = villa.villaId;
    slug = villa.slug;
  }

  let imageCount = 0;
  if (listing.imageUrls.length > 0) {
    const gallery = await importVillaGalleryFromUrls(villaId, listing.imageUrls, {
      force: true,
    });
    imageCount = gallery.importedCount;
  } else {
    warnings.push(
      googleDriveUrl
        ? "Google Drive bağlantısından villa görseli alınamadı"
        : "Kaynak sayfada villa görseli bulunamadı"
    );
  }

  const distanceCount = await persistDistances(villaId, listing.distances);
  await persistPool(villaId, listing.pool);
  const roomCount = await persistRooms(villaId, listing.rooms);
  if (listing.rooms.length === 0) {
    warnings.push("Kaynak sayfada oda detayı bulunamadı");
  }

  let periodCount = 0;
  let bookedDays = 0;
  let optionDays = 0;
  try {
    const imported = await importVillaPeriodsFromExternalPage(villaId, syncUrl, {
      syncMode: "calendar_and_price",
    });
    periodCount = imported.periodCount;
    bookedDays = imported.bookedDays;
    optionDays = imported.optionDays;
    warnings.push(...imported.warnings);
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `Fiyat/takvim aktarılamadı: ${error.message}`
        : "Fiyat/takvim aktarılamadı"
    );
  }

  const villa = await prisma.villa.findUniqueOrThrow({
    where: { id: villaId },
    select: { id: true, villaId: true, name: true, slug: true },
  });

  return {
    created,
    villaId: villa.id,
    numericVillaId: villa.villaId,
    name: villa.name,
    slug: villa.slug,
    editPath: villaAdminEditPath(villa),
    imageCount,
    distanceCount,
    periodCount,
    bookedDays,
    optionDays,
    roomCount,
    documentNo,
    link1: syncUrl,
    published: visibility.active && visibility.showInSearch,
    warnings,
  };
}

/**
 * Mevcut villaya kaynak sayfadan yalnızca oda / havuz / konum / mesafe aktarır.
 * Galeri ve fiyat/takvime dokunmaz (eksik detay doldurma için).
 */
export async function enrichVillaDetailsFromExternalUrl(
  pageUrlRaw: string,
  options?: { villaId?: string }
): Promise<{
  villaId: string;
  numericVillaId: number | null;
  name: string;
  editPath: string;
  roomCount: number;
  distanceCount: number;
  poolUpdated: boolean;
  locationLabel: string;
  latitude: number;
  longitude: number;
  warnings: string[];
}> {
  const pageUrl = normalizeUrl(pageUrlRaw);
  const listing = await scrapeExternalVillaListing(pageUrl);
  const syncUrl = normalizeUrl(listing.pageUrl || pageUrl);
  const warnings: string[] = [];

  const existing =
    (options?.villaId
      ? await prisma.villa.findUnique({
          where: { id: options.villaId },
          select: { id: true, villaId: true, name: true, slug: true },
        })
      : null) ?? (await findExistingVilla(syncUrl, listing));

  if (!existing) {
    throw new Error(
      "Villa bulunamadı. Önce dış siteden kurulum yapın veya villaId verin."
    );
  }

  const regionId = await resolveMahalleRegionId(listing);
  await prisma.villa.update({
    where: { id: existing.id },
    data: {
      location: listing.locationLabel || undefined,
      latitude: listing.latitude,
      longitude: listing.longitude,
      regionId,
      guests: listing.guests,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      livingRooms: listing.livingRooms,
    },
  });

  const distanceCount = await persistDistances(existing.id, listing.distances);
  await persistPool(existing.id, listing.pool);
  const roomCount = await persistRooms(existing.id, listing.rooms);

  if (!listing.pool) warnings.push("Kaynak sayfada havuz bilgisi bulunamadı");
  if (listing.rooms.length === 0) {
    warnings.push("Kaynak sayfada oda detayı bulunamadı");
  }
  if (!listing.latitude && !listing.longitude) {
    warnings.push("Kaynak sayfada konum koordinatı bulunamadı");
  }

  return {
    villaId: existing.id,
    numericVillaId: existing.villaId,
    name: existing.name,
    editPath: villaAdminEditPath(existing),
    roomCount,
    distanceCount,
    poolUpdated: Boolean(listing.pool),
    locationLabel: listing.locationLabel,
    latitude: listing.latitude,
    longitude: listing.longitude,
    warnings,
  };
}
