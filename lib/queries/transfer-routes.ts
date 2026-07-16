import { prisma } from "@/lib/db";

export type TransferRoutePriceItem = {
  id: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  price: number;
  isActive: boolean;
};

export type TransferRouteItem = {
  id: string;
  title: string;
  slug: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  priority: number;
  tag: string;
  sefUrl: string;
  seoTitle: string;
  seoDesc: string;
  seoKeywords: string;
  creditCardPaymentEnabled: boolean;
  bankTransferDiscountRate: number;
  creditCardDiscountRate: number;
  isActive: boolean;
  onList: boolean;
  tripCount: number;
  vehiclePrices: TransferRoutePriceItem[];
};

export async function getTransferRoutesAdminData() {
  const items = await prisma.transferRoute.findMany({
    orderBy: [{ priority: "asc" }, { title: "asc" }],
    include: {
      vehiclePrices: {
        include: {
          vehicleType: { select: { id: true, name: true } },
        },
        orderBy: { vehicleType: { sortOrder: "asc" } },
      },
      _count: { select: { trips: true } },
    },
  });

  return {
    items: items.map(
      (item): TransferRouteItem => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        startPoint: item.startPoint,
        endPoint: item.endPoint,
        distanceKm: item.distanceKm,
        durationMinutes: item.durationMinutes,
        priority: item.priority,
        tag: item.tag,
        sefUrl: item.sefUrl,
        seoTitle: item.seoTitle,
        seoDesc: item.seoDesc,
        seoKeywords: item.seoKeywords,
        creditCardPaymentEnabled: item.creditCardPaymentEnabled,
        bankTransferDiscountRate: item.bankTransferDiscountRate,
        creditCardDiscountRate: item.creditCardDiscountRate,
        isActive: item.isActive,
        onList: item.onList,
        tripCount: item._count.trips,
        vehiclePrices: item.vehiclePrices.map((price) => ({
          id: price.id,
          vehicleTypeId: price.vehicleTypeId,
          vehicleTypeName: price.vehicleType.name,
          price: price.price,
          isActive: price.isActive,
        })),
      })
    ),
    totalCount: items.length,
    activeCount: items.filter((i) => i.isActive).length,
  };
}

export async function getTransferRoutesForPicker() {
  return prisma.transferRoute.findMany({
    where: { isActive: true },
    orderBy: [{ priority: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      startPoint: true,
      endPoint: true,
      distanceKm: true,
      durationMinutes: true,
      vehiclePrices: {
        where: { isActive: true },
        select: { vehicleTypeId: true, price: true },
      },
    },
  });
}
