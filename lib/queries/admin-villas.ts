import { prisma } from "@/lib/db";
import { facilityTypeOptions } from "@/lib/facility-type";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import { buildRegionTree } from "@/lib/regions-tree";
import { getRegionTreeFlat } from "@/lib/queries/region-tree";
import { resolveVillaDocumentType } from "@/lib/villa-document-types";

type RegionWithParents = {
  id: string;
  slug: string;
  name: string;
  parent: {
    name: string;
    slug: string;
    parent: { name: string; slug: string } | null;
  } | null;
};

function buildRegionBreadcrumb(region: RegionWithParents) {
  const parts = [
    region.parent?.parent?.name,
    region.parent?.name,
    region.name,
  ].filter(Boolean);

  return parts.join(" > ");
}

function getRegionIlSlug(region: RegionWithParents) {
  return region.parent?.parent?.slug ?? region.parent?.slug ?? region.slug;
}

function getRegionPathSlugs(region: RegionWithParents): string[] {
  const slugs = [region.slug];
  if (region.parent) {
    slugs.push(region.parent.slug);
    if (region.parent.parent) {
      slugs.push(region.parent.parent.slug);
    }
  }
  return slugs;
}

export async function getAdminVillaListData() {
  const [villas, regionFlat] = await Promise.all([
    prisma.villa.findMany({
      select: {
        id: true,
        villaId: true,
        slug: true,
        name: true,
        originalName: true,
        category: true,
        image: true,
        images: true,
        active: true,
        documentNo: true,
        documentType: true,
        location: true,
        region: {
          select: {
            id: true,
            slug: true,
            name: true,
            parent: {
              select: {
                name: true,
                slug: true,
                parent: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    getRegionTreeFlat(),
  ]);

  const regionTree = buildRegionTree(regionFlat.filter((region) => region.active));

  return {
    villas: villas.map((villa) => ({
      id: villa.id,
      villaId: villa.villaId,
      slug: villa.slug,
      name: villa.name,
      originalName: villa.originalName,
      category: villa.category,
      image: getVillaShowcaseImage(villa),
      active: villa.active,
      documentNo: villa.documentNo,
      documentType: resolveVillaDocumentType(
        villa.documentNo ?? "",
        villa.documentType
      ),
      location: villa.location,
      regionId: villa.region.id,
      regionSlug: villa.region.slug,
      regionIlSlug: getRegionIlSlug(villa.region),
      regionPathSlugs: getRegionPathSlugs(villa.region),
      regionBreadcrumb: buildRegionBreadcrumb(villa.region),
    })),
    regionTree,
    typeOptions: [
      { value: "all", label: "Tümü" },
      ...facilityTypeOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ],
  };
}

export type AdminVillaListItem = Awaited<
  ReturnType<typeof getAdminVillaListData>
>["villas"][number];
