import { prisma } from "@/lib/db";
import type { VillaPeriodCurrency } from "@prisma/client";

export type TourImageItem = {
  id: string;
  url: string;
  alt: string;
  isMain: boolean;
  sortOrder: number;
};

export type TourItem = {
  id: string;
  sourceId: number | null;
  slug: string;
  title: string;
  shortDesc: string;
  overview: string;
  descriptionHtml: string;
  location: string;
  durationHours: string;
  groupSize: string;
  tag: string;
  priceFrom: number | null;
  currency: VillaPeriodCurrency;
  hasTransfer: boolean;
  freeCancelationHours: string;
  includesJson: string;
  highlightsJson: string;
  excludesJson: string;
  coverImage: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  canonicalPath: string;
  sortOrder: number;
  isActive: boolean;
  onList: boolean;
  images?: TourImageItem[];
};

function parseJsonList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

export function tourIncludes(tour: Pick<TourItem, "includesJson">) {
  return parseJsonList(tour.includesJson);
}

export function tourHighlights(tour: Pick<TourItem, "highlightsJson">) {
  return parseJsonList(tour.highlightsJson);
}

export function tourExcludes(tour: Pick<TourItem, "excludesJson">) {
  return parseJsonList(tour.excludesJson);
}

export async function getToursAdminData() {
  const items = await prisma.tour.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });
  return {
    items: items as TourItem[],
    totalCount: items.length,
    activeCount: items.filter((i) => i.isActive).length,
  };
}

export async function getPublishedTours() {
  return prisma.tour.findMany({
    where: { isActive: true, onList: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      images: {
        orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  }) as Promise<TourItem[]>;
}

export async function getPublishedTourBySlug(slug: string) {
  return prisma.tour.findFirst({
    where: { slug, isActive: true },
    include: {
      images: {
        orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
      },
    },
  }) as Promise<(TourItem & { images: TourImageItem[] }) | null>;
}
