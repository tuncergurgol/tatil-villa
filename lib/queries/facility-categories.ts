import { prisma } from "@/lib/db";
import {
  HOME_DREAM_CATEGORY_CARDS,
  buildDreamAmenitySearchHref,
  buildDreamFacilitySearchHref,
  type HomeDreamCategoryCard,
} from "@/lib/home-dream-categories";
import {
  getPublicSiteFacilityCategories,
  type PublicSiteKey,
} from "@/lib/public-site-keys";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";

export async function getFacilityCategoryAdminData() {
  const categories = await prisma.facilityCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      tag: true,
      image: true,
      description: true,
      longDescription: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      published: true,
      showInSearch: true,
      showInOffer: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    categories,
    totalCount: categories.length,
    activeCount: categories.filter((item) => item.published).length,
    passiveCount: categories.filter((item) => !item.published).length,
  };
}

export type FacilityCategoryItem = Awaited<
  ReturnType<typeof getFacilityCategoryAdminData>
>["categories"][number];

export async function getFacilityCategoriesForPicker() {
  return prisma.facilityCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export type FacilityCategoryOption = Awaited<
  ReturnType<typeof getFacilityCategoriesForPicker>
>[number];

/**
 * Anasayfa hayal / stil kartları — Ev Kategorileri ile eşleşir.
 * Kategori yoksa veya villada henüz atanmamışsa amenity fallback kullanılır.
 */
export async function getHomeDreamCategories(
  siteKey?: PublicSiteKey
): Promise<HomeDreamCategoryCard[]> {
  const slugs = HOME_DREAM_CATEGORY_CARDS.map((card) => card.facilitySlug);
  const [categories, villas] = await Promise.all([
    prisma.facilityCategory.findMany({
      where: { slug: { in: slugs } },
      select: {
        name: true,
        slug: true,
        image: true,
      },
    }),
    prisma.villa.findMany({
      where: await resolvePublicSiteVillaFilter(
        { active: true, showInSearch: true },
        siteKey
      ),
      select: { facilityCategories: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const villa of villas) {
    for (const name of villa.facilityCategories) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const bySlug = new Map(categories.map((category) => [category.slug, category]));

  return HOME_DREAM_CATEGORY_CARDS.flatMap((card) => {
    const category = bySlug.get(card.facilitySlug);
    const facilityCount = category ? (counts.get(category.name) ?? 0) : 0;

    if (category && facilityCount > 0) {
      return [
        {
          title: card.title,
          image: category.image || card.fallbackImage,
          href: buildDreamFacilitySearchHref(category.name),
        },
      ];
    }

    if (card.amenityFallback) {
      return [
        {
          title: card.title,
          image: category?.image || card.fallbackImage,
          href: buildDreamAmenitySearchHref(card.amenityFallback),
        },
      ];
    }

    if (category) {
      return [
        {
          title: card.title,
          image: category.image || card.fallbackImage,
          href: buildDreamFacilitySearchHref(category.name),
        },
      ];
    }

    return [];
  });
}

const THEME_2_TYPE_FALLBACK_IMAGES: Record<string, string> = {
  bungalov: "/brands/glamping-turkey/chip-bungalov.jpg",
  bungalows: "/brands/glamping-turkey/chip-bungalov.jpg",
  domes: "/brands/glamping-turkey/chip-domes.jpg",
};

export type Theme2FacilityChip = {
  name: string;
  href: string;
  image: string;
};

export async function getTheme2FacilityChips(
  siteKey?: PublicSiteKey
): Promise<Theme2FacilityChip[]> {
  const names = getPublicSiteFacilityCategories(siteKey);
  if (names.length === 0) return [];

  const categories = await prisma.facilityCategory.findMany({
    where: {
      OR: [{ name: { in: names } }, { slug: { in: names.map((n) => n.toLowerCase()) } }],
    },
    select: { name: true, slug: true, image: true },
  });

  const byName = new Map(
    categories.map((category) => [category.name.toLocaleLowerCase("tr-TR"), category])
  );
  const bySlug = new Map(categories.map((category) => [category.slug, category]));

  return names.map((name) => {
    const key = name.toLocaleLowerCase("tr-TR");
    const category = byName.get(key) ?? bySlug.get(key);
    const fallback =
      THEME_2_TYPE_FALLBACK_IMAGES[category?.slug ?? key] ??
      THEME_2_TYPE_FALLBACK_IMAGES.bungalov;
    return {
      name: category?.name || name,
      href: buildDreamFacilitySearchHref(category?.name || name),
      image: fallback,
    };
  });
}
