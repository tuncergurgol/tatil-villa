import { prisma } from "@/lib/db";
import type {
  TransferTripDirection,
  TransferTripStatus,
  VillaPeriodCurrency,
} from "@prisma/client";

export type TransferTripItem = {
  id: string;
  routeId: string | null;
  routeTitle: string | null;
  vehicleTypeId: string;
  vehicleTypeName: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  direction: TransferTripDirection;
  serviceType: string;
  tripDate: string;
  tripTime: string;
  returnDate: string | null;
  returnTime: string;
  adults: number;
  children: number;
  babies: number;
  contactName: string;
  contactSurname: string;
  contactPhone: string;
  contactEmail: string;
  contactIdNumber: string;
  flightNumber: string;
  driverSign: string;
  totalPrice: number | null;
  currency: VillaPeriodCurrency;
  status: TransferTripStatus;
  note: string;
  adminNote: string;
  specialRequests: string;
};

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function getTransferTripsAdminData() {
  const items = await prisma.transferTrip.findMany({
    orderBy: [{ tripDate: "desc" }, { tripTime: "desc" }, { createdAt: "desc" }],
    include: {
      route: { select: { id: true, title: true } },
      vehicleType: { select: { id: true, name: true } },
    },
  });

  return {
    items: items.map(
      (item): TransferTripItem => ({
        id: item.id,
        routeId: item.routeId,
        routeTitle: item.route?.title ?? null,
        vehicleTypeId: item.vehicleTypeId,
        vehicleTypeName: item.vehicleType.name,
        startPoint: item.startPoint,
        endPoint: item.endPoint,
        distanceKm: item.distanceKm,
        durationMinutes: item.durationMinutes,
        direction: item.direction,
        serviceType: item.serviceType,
        tripDate: toDateKey(item.tripDate),
        tripTime: item.tripTime,
        returnDate: item.returnDate ? toDateKey(item.returnDate) : null,
        returnTime: item.returnTime,
        adults: item.adults,
        children: item.children,
        babies: item.babies,
        contactName: item.contactName,
        contactSurname: item.contactSurname,
        contactPhone: item.contactPhone,
        contactEmail: item.contactEmail,
        contactIdNumber: item.contactIdNumber,
        flightNumber: item.flightNumber,
        driverSign: item.driverSign,
        totalPrice: item.totalPrice,
        currency: item.currency,
        status: item.status,
        note: item.note,
        adminNote: item.adminNote,
        specialRequests: item.specialRequests,
      })
    ),
    totalCount: items.length,
    newCount: items.filter((i) => i.status === "NEW").length,
    confirmedCount: items.filter((i) => i.status === "CONFIRMED").length,
  };
}
