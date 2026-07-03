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
