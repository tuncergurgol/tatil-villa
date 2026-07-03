import type { PriceInclusionType } from "@prisma/client";
import { prisma } from "@/lib/db";

export function comparePriceInclusionDescriptions(
  a: { description: string },
  b: { description: string }
) {
  return a.description.localeCompare(b.description, "tr", {
    sensitivity: "base",
  });
}

export async function syncAlphabeticalPriceInclusionSortOrders(
  type: PriceInclusionType
) {
  const items = await prisma.priceInclusionItem.findMany({
    where: { type },
    select: { id: true, description: true },
  });

  items.sort(comparePriceInclusionDescriptions);

  await prisma.$transaction(
    items.map((item, index) =>
      prisma.priceInclusionItem.update({
        where: { id: item.id },
        data: { sortOrder: index },
      })
    )
  );
}

export async function syncAllPriceInclusionSortOrders() {
  await syncAlphabeticalPriceInclusionSortOrders("INCLUDED");
  await syncAlphabeticalPriceInclusionSortOrders("EXCLUDED");
}
