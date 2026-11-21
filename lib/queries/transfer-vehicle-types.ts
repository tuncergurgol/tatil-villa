import { prisma } from "@/lib/db";
import type { VillaPeriodCurrency } from "@prisma/client";

export type TransferVehicleTypeItem = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  passengerCapacity: number;
  luggageCapacity: number;
  basePricePerKm: number;
  priceMultiplier: number;
  minimumFare: number;
  includedKm: number;
  currency: VillaPeriodCurrency;
  image: string;
  sortOrder: number;
  isActive: boolean;
  tripCount: number;
  routePriceCount: number;
};

export async function getTransferVehicleTypesAdminData() {
  const items = await prisma.transferVehicleType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { trips: true, routePrices: true } },
    },
  });

  return {
    items: items.map(
      (item): TransferVehicleTypeItem => ({
        id: item.id,
        code: item.code,
        name: item.name,
        nameEn: item.nameEn,
        description: item.description,
        passengerCapacity: item.passengerCapacity,
        luggageCapacity: item.luggageCapacity,
        basePricePerKm: item.basePricePerKm,
        priceMultiplier: item.priceMultiplier,
        minimumFare: item.minimumFare,
        includedKm: item.includedKm,
        currency: item.currency,
        image: item.image,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        tripCount: item._count.trips,
        routePriceCount: item._count.routePrices,
      })
    ),
    totalCount: items.length,
    activeCount: items.filter((i) => i.isActive).length,
  };
}

export async function getTransferVehicleTypesForPicker() {
  return prisma.transferVehicleType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      passengerCapacity: true,
      currency: true,
    },
  });
}
