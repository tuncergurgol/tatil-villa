import { RegionLevel, VillaCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { facilityTypeOptions } from "@/lib/facility-type";

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

export async function getAdminVillaListData() {
  const [villas, regionOptions] = await Promise.all([
    prisma.villa.findMany({
      select: {
        id: true,
        villaId: true,
        slug: true,
        name: true,
        category: true,
        image: true,
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
    prisma.region.findMany({
      where: { level: RegionLevel.IL, active: true },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    villas: villas.map((villa) => ({
      id: villa.id,
      villaId: villa.villaId,
      slug: villa.slug,
      name: villa.name,
      category: villa.category,
      image: villa.image,
      active: villa.active,
      documentNo: villa.documentNo,
      documentType: villa.documentType,
      location: villa.location,
      regionId: villa.region.id,
      regionSlug: villa.region.slug,
      regionIlSlug: getRegionIlSlug(villa.region),
      regionBreadcrumb: buildRegionBreadcrumb(villa.region),
    })),
    regionOptions,
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
