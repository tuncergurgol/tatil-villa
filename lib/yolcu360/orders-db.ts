import { prisma } from "@/lib/db";
import type { Yolcu360Order as ApiOrder } from "@/lib/yolcu360/types";

export async function listYolcu360Orders(limit = 50) {
  return prisma.yolcu360Order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function upsertYolcu360OrderFromApi(
  apiOrder: ApiOrder,
  trackingId?: string,
  searchSnapshot?: unknown
) {
  const passenger = apiOrder.passenger;
  const car = apiOrder.orderedCarProduct?.car;
  const total =
    car?.pricing?.paymentTotal?.amount ??
    car?.pricing?.total?.amount ??
    0;
  const currency =
    car?.pricing?.paymentTotal?.currency ??
    car?.pricing?.total?.currency ??
    "TRY";

  return prisma.yolcu360Order.upsert({
    where: { yolcu360OrderId: apiOrder.id },
    create: {
      yolcu360OrderId: apiOrder.id,
      trackingId: trackingId ?? "",
      status: apiOrder.orderedCarProduct?.status ?? "pending",
      passengerName: passenger
        ? `${passenger.firstName ?? ""} ${passenger.lastName ?? ""}`.trim()
        : "",
      passengerEmail: passenger?.email ?? "",
      passengerPhone: passenger?.phone ?? "",
      carBrand: car?.brand?.name ?? "",
      carModel: car?.model?.name ?? "",
      vendorName: car?.vendor?.displayName ?? car?.vendor?.name ?? "",
      totalAmount: total,
      currency,
      checkInAt: car?.appointment?.checkInDateTime
        ? new Date(car.appointment.checkInDateTime)
        : null,
      checkOutAt: car?.appointment?.checkOutDateTime
        ? new Date(car.appointment.checkOutDateTime)
        : null,
      searchSnapshot: searchSnapshot as object | undefined,
      rawOrder: apiOrder as object,
    },
    update: {
      status: apiOrder.orderedCarProduct?.status ?? "pending",
      passengerName: passenger
        ? `${passenger.firstName ?? ""} ${passenger.lastName ?? ""}`.trim()
        : "",
      passengerEmail: passenger?.email ?? "",
      passengerPhone: passenger?.phone ?? "",
      carBrand: car?.brand?.name ?? "",
      carModel: car?.model?.name ?? "",
      vendorName: car?.vendor?.displayName ?? car?.vendor?.name ?? "",
      totalAmount: total,
      currency,
      checkInAt: car?.appointment?.checkInDateTime
        ? new Date(car.appointment.checkInDateTime)
        : null,
      checkOutAt: car?.appointment?.checkOutDateTime
        ? new Date(car.appointment.checkOutDateTime)
        : null,
      rawOrder: apiOrder as object,
    },
  });
}

export async function syncYolcu360OrderStatus(orderId: string, status: string) {
  return prisma.yolcu360Order.update({
    where: { yolcu360OrderId: orderId },
    data: { status },
  });
}
