import { access, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getVillaGalleryImages } from "@/lib/villa-gallery";
import { formatVillaRegionLabel } from "@/lib/villa-location-helpers";
import {
  INSTAGRAM_STORY_TAGLINES,
  type InstagramStoryVillaPayload,
} from "@/lib/instagram-story/types";

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
    getCompanySettings(),
  ]);

  if (!villa) return null;

  const regionLabel = formatVillaRegionLabel(villa.region);
  const location = regionLabel || villa.location || "";
  const images = getVillaGalleryImages(villa);
  const domain = (company.domain ?? "www.tatildeyiz.com.tr")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  return {
    id: villa.id,
    slug: villa.slug,
    name: villa.name,
    location,
    guests: villa.guests,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    images,
    defaultMeta: `${villa.guests} Kişi  ·  ${villa.bedrooms} Oda  ·  Özel Havuz`,
    defaultTagline: INSTAGRAM_STORY_TAGLINES[0],
    defaultCta: domain || "tatildeyiz.com.tr",
    logoUrl: company.logoUrl || "",
    accentColor: company.primaryColor || "#0d9488",
  };
}

export async function searchInstagramStoryVillas(query: string, limit = 12) {
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
