import { access, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  collectDescendantIds,
  getAllRegionNodes,
} from "@/lib/queries/region-tree";
import { getVillaGalleryImages } from "@/lib/villa-gallery";
import { formatVillaRegionLabel } from "@/lib/villa-location-helpers";
import {
  INSTAGRAM_STORY_TAGLINES,
  type InstagramStoryCollectionPayload,
  type InstagramStoryImageItem,
  type InstagramStorySearchHit,
  type InstagramStoryVillaPayload,
} from "@/lib/instagram-story/types";

const MAX_COLLECTION_IMAGES = 24;
const MAX_COLLECTION_VILLAS = 24;

function toPublicFilePath(url: string): string | null {
  let pathname = url.trim();
  if (!pathname) return null;

  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.includes("..") || pathname.includes("\\")) return null;

  return path.join(process.cwd(), "public", pathname.replace(/^\//, ""));
}

export async function readPublicAssetBuffer(
  url: string
): Promise<Buffer | null> {
  const filePath = toPublicFilePath(url);
  if (!filePath) return null;
  try {
    await access(filePath);
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".svg") {
      return sharp(buf, { density: 400 }).png().toBuffer();
    }
    return buf;
  } catch {
    return null;
  }
}

async function companyDefaults() {
  const company = await getCompanySettings();
  const domain = (company.domain ?? "www.tatildeyiz.com.tr")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return {
    domain: domain || "tatildeyiz.com.tr",
    logoUrl: company.logoUrl || "",
    accentColor: company.primaryColor || "#0d9488",
  };
}

function collectUniqueImages(
  villas: Array<{
    id: string;
    name: string;
    image: string;
    images: string[];
  }>,
  maxImages: number
): InstagramStoryImageItem[] {
  const items: InstagramStoryImageItem[] = [];
  const seen = new Set<string>();

  for (const villa of villas) {
    const gallery = getVillaGalleryImages(villa);
    const cover = gallery[0];
    if (!cover || seen.has(cover)) continue;
    seen.add(cover);
    items.push({
      url: cover,
      villaId: villa.id,
      villaName: villa.name,
    });
    if (items.length >= maxImages) break;
  }

  if (items.length < Math.min(8, maxImages)) {
    for (const villa of villas) {
      const gallery = getVillaGalleryImages(villa);
      for (const url of gallery.slice(1, 3)) {
        if (seen.has(url)) continue;
        seen.add(url);
        items.push({
          url,
          villaId: villa.id,
          villaName: villa.name,
        });
        if (items.length >= maxImages) return items;
      }
    }
  }

  return items;
}

export async function getInstagramStoryVilla(
  villaId: string
): Promise<InstagramStoryVillaPayload | null> {
  const [villa, company] = await Promise.all([
    prisma.villa.findUnique({
      where: { id: villaId },
      select: {
        id: true,
        slug: true,
        name: true,
        location: true,
        guests: true,
        bedrooms: true,
        bathrooms: true,
        image: true,
        images: true,
        region: {
          select: {
            name: true,
            level: true,
            parent: {
              select: {
                name: true,
                level: true,
                parent: { select: { name: true, level: true } },
              },
            },
          },
        },
      },
    }),
    companyDefaults(),
  ]);

  if (!villa) return null;

  const regionLabel = formatVillaRegionLabel(villa.region);
  const location = regionLabel || villa.location || "";
  const images = getVillaGalleryImages(villa);
  const imageItems = images.map((url) => ({
    url,
    villaId: villa.id,
    villaName: villa.name,
  }));

  return {
    mode: "villa",
    id: villa.id,
    slug: villa.slug,
    name: villa.name,
    location,
    guests: villa.guests,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    images,
    imageItems,
    defaultMeta: `${villa.guests} Kişi  ·  ${villa.bedrooms} Oda  ·  Özel Havuz`,
    defaultTagline: INSTAGRAM_STORY_TAGLINES[0],
    defaultCta: company.domain,
    logoUrl: company.logoUrl,
    accentColor: company.accentColor,
    villaCount: 1,
  };
}

export async function searchInstagramStoryVillas(
  query: string,
  limit = 12
): Promise<InstagramStorySearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const villas = await prisma.villa.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { originalName: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      images: true,
      guests: true,
      bedrooms: true,
      region: {
        select: {
          name: true,
          level: true,
          parent: {
            select: {
              name: true,
              level: true,
              parent: { select: { name: true, level: true } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return villas.map((villa) => ({
    id: villa.id,
    name: villa.name,
    slug: villa.slug,
    image: getVillaGalleryImages(villa)[0] ?? "",
    location: formatVillaRegionLabel(villa.region),
    guests: villa.guests,
    bedrooms: villa.bedrooms,
  }));
}

export async function searchInstagramStoryCategories(
  query: string,
  limit = 20
): Promise<InstagramStorySearchHit[]> {
  const q = query.trim();
  const categories = await prisma.facilityCategory.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { tag: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      tag: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit,
  });

  if (categories.length === 0) return [];

  const names = categories.map((c) => c.name);
  const villas = await prisma.villa.findMany({
    where: {
      active: true,
      facilityCategories: { hasSome: names },
    },
    select: { facilityCategories: true },
  });

  const counts = new Map<string, number>();
  for (const villa of villas) {
    for (const name of villa.facilityCategories) {
      if (!names.includes(name)) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image || "",
    location: category.tag || "Ev kategorisi",
    villaCount: counts.get(category.name) ?? 0,
  }));
}

export type InstagramStoryRegionPickerOption = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  villaCount: number;
};

export async function listInstagramStoryRegionPickerOptions(): Promise<
  InstagramStoryRegionPickerOption[]
> {
  const [regions, nodes, villaGroups] = await Promise.all([
    prisma.region.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getAllRegionNodes(),
    prisma.villa.groupBy({
      by: ["regionId"],
      where: { active: true },
      _count: { _all: true },
    }),
  ]);

  const countByRegionId = new Map(
    villaGroups.map((group) => [group.regionId, group._count._all])
  );

  return regions.map((region) => {
    const regionIds = collectDescendantIds(region.id, nodes);
    const villaCount = regionIds.reduce(
      (sum, id) => sum + (countByRegionId.get(id) ?? 0),
      0
    );
    return {
      id: region.id,
      name: region.name,
      level: region.level,
      parentId: region.parentId,
      villaCount,
    };
  });
}

export async function searchInstagramStoryRegions(
  query: string,
  limit = 16
): Promise<InstagramStorySearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const [regions, nodes, villaGroups] = await Promise.all([
    prisma.region.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        level: true,
        parent: {
          select: {
            name: true,
            parent: { select: { name: true } },
          },
        },
      },
      orderBy: [{ level: "asc" }, { name: "asc" }],
      take: limit,
    }),
    getAllRegionNodes(),
    prisma.villa.groupBy({
      by: ["regionId"],
      where: { active: true },
      _count: { _all: true },
    }),
  ]);

  const countByRegionId = new Map(
    villaGroups.map((group) => [group.regionId, group._count._all])
  );

  return regions.map((region) => {
    const regionIds = collectDescendantIds(region.id, nodes);
    const villaCount = regionIds.reduce(
      (sum, id) => sum + (countByRegionId.get(id) ?? 0),
      0
    );
    const parentParts = [
      region.parent?.parent?.name,
      region.parent?.name,
    ].filter(Boolean);
    return {
      id: region.id,
      name: region.name,
      slug: region.slug,
      image: region.image || "",
      location: parentParts.length
        ? parentParts.join(" › ")
        : region.level === "IL"
          ? "İl"
          : region.level === "ILCE"
            ? "İlçe"
            : "Mahalle",
      villaCount,
      level: region.level,
    };
  });
}

export async function getInstagramStoryCategory(
  categoryId: string
): Promise<InstagramStoryCollectionPayload | null> {
  const [category, company] = await Promise.all([
    prisma.facilityCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        tag: true,
        image: true,
      },
    }),
    companyDefaults(),
  ]);
  if (!category) return null;

  const villas = await prisma.villa.findMany({
    where: {
      active: true,
      facilityCategories: { has: category.name },
    },
    select: {
      id: true,
      name: true,
      image: true,
      images: true,
      featured: true,
      popular: true,
      recommended: true,
    },
    orderBy: [
      { featured: "desc" },
      { popular: "desc" },
      { recommended: "desc" },
      { name: "asc" },
    ],
    take: MAX_COLLECTION_VILLAS,
  });

  const imageItems = collectUniqueImages(villas, MAX_COLLECTION_IMAGES);
  const villaCount = await prisma.villa.count({
    where: {
      active: true,
      facilityCategories: { has: category.name },
    },
  });

  return {
    mode: "category",
    id: category.id,
    slug: category.slug,
    name: category.name,
    location: category.tag || "Kategori seçkisi",
    images: imageItems.map((item) => item.url),
    imageItems,
    defaultMeta: `${villaCount} tesis  ·  Kolaj story`,
    defaultTagline: "KATEGORİ SEÇKİSİ",
    defaultCta: company.domain,
    logoUrl: company.logoUrl,
    accentColor: company.accentColor,
    villaCount,
  };
}

export async function getInstagramStoryRegion(
  regionId: string
): Promise<InstagramStoryCollectionPayload | null> {
  const [region, company, nodes] = await Promise.all([
    prisma.region.findUnique({
      where: { id: regionId },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        level: true,
        parent: {
          select: {
            name: true,
            parent: { select: { name: true } },
          },
        },
      },
    }),
    companyDefaults(),
    getAllRegionNodes(),
  ]);
  if (!region) return null;

  const regionIds = collectDescendantIds(region.id, nodes);
  const villas = await prisma.villa.findMany({
    where: {
      active: true,
      regionId: { in: regionIds },
    },
    select: {
      id: true,
      name: true,
      image: true,
      images: true,
      featured: true,
      popular: true,
      recommended: true,
    },
    orderBy: [
      { featured: "desc" },
      { popular: "desc" },
      { recommended: "desc" },
      { name: "asc" },
    ],
    take: MAX_COLLECTION_VILLAS,
  });

  const imageItems = collectUniqueImages(villas, MAX_COLLECTION_IMAGES);
  const villaCount = await prisma.villa.count({
    where: { active: true, regionId: { in: regionIds } },
  });
  const parentParts = [region.parent?.parent?.name, region.parent?.name].filter(
    Boolean
  );
  const location =
    parentParts.length > 0 ? parentParts.join(" › ") : "Bölge seçkisi";

  return {
    mode: "region",
    id: region.id,
    slug: region.slug,
    name: region.name,
    location,
    images: imageItems.map((item) => item.url),
    imageItems,
    defaultMeta: `${villaCount} tesis  ·  Kolaj story`,
    defaultTagline: "BÖLGE SEÇKİSİ",
    defaultCta: company.domain,
    logoUrl: company.logoUrl,
    accentColor: company.accentColor,
    villaCount,
  };
}
