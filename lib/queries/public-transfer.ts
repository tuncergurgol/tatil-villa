import { prisma } from "@/lib/db";

export type PublicTransferRoute = {
  id: string;
  title: string;
  slug: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  tag: string;
  vehiclePrices: Array<{
    vehicleTypeId: string;
    vehicleTypeName: string;
    capacity: number;
    price: number;
  }>;
};

export type PublicTransferPageData = {
  routes: PublicTransferRoute[];
  vehicleTypes: Array<{
    id: string;
    name: string;
    capacity: number;
  }>;
  whatsapp: string;
  phone: string;
};

export async function getPublicTransferPageData(): Promise<PublicTransferPageData> {
  const [routes, vehicleTypes, company] = await Promise.all([
    prisma.transferRoute.findMany({
      where: { isActive: true, onList: true },
      orderBy: [{ priority: "asc" }, { title: "asc" }],
      include: {
        vehiclePrices: {
          where: { isActive: true },
          include: {
            vehicleType: {
              select: {
                id: true,
                name: true,
                passengerCapacity: true,
                isActive: true,
              },
            },
          },
          orderBy: { vehicleType: { sortOrder: "asc" } },
        },
      },
    }),
    prisma.transferVehicleType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, passengerCapacity: true },
    }),
    prisma.companySettings.findUnique({
      where: { id: "default" },
      select: { whatsapp: true, phone: true },
    }),
  ]);

  return {
    routes: routes.map((route) => ({
      id: route.id,
      title: route.title,
      slug: route.slug,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      tag: route.tag,
      vehiclePrices: route.vehiclePrices
        .filter((price) => price.vehicleType.isActive)
        .map((price) => ({
          vehicleTypeId: price.vehicleTypeId,
          vehicleTypeName: price.vehicleType.name,
          capacity: price.vehicleType.passengerCapacity,
          price: price.price,
        })),
    })),
    vehicleTypes: vehicleTypes.map((item) => ({
      id: item.id,
      name: item.name,
      capacity: item.passengerCapacity,
    })),
    whatsapp: company?.whatsapp ?? "",
    phone: company?.phone ?? "",
  };
}
