import { prisma } from "@/lib/db";

export async function getPriceInclusionAdminData() {
  const items = await prisma.priceInclusionItem.findMany({
    select: {
      id: true,
      description: true,
      type: true,
      isDefault: true,
      sortOrder: true,
      active: true,
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { description: "asc" }],
  });

  const included = items.filter((item) => item.type === "INCLUDED");
  const excluded = items.filter((item) => item.type === "EXCLUDED");
  const defaultCount = items.filter((item) => item.isDefault).length;

  return {
    items,
    included,
    excluded,
    totalCount: items.length,
    defaultCount,
  };
}

export type PriceInclusionItem = Awaited<
  ReturnType<typeof getPriceInclusionAdminData>
>["items"][number];

const villaPriceInclusionSelect = {
  id: true,
  description: true,
  type: true,
} as const;

/** Villa özel seçim yoksa varsayılan (isDefault) fiyata dahil/hariç kalemlerini döner. */
export async function getVillaPriceInclusionItems(priceInclusionIds: string[]) {
  return prisma.priceInclusionItem.findMany({
    where:
      priceInclusionIds.length > 0
        ? { id: { in: priceInclusionIds }, active: true }
        : { isDefault: true, active: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    select: villaPriceInclusionSelect,
  });
}
