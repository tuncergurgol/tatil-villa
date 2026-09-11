import { prisma } from "@/lib/db";
import type { Yolcu360Order as ApiOrder } from "@/lib/yolcu360/types";
import { notifyYolcu360OrderLead } from "@/lib/yolcu360/order-notify";

export async function listYolcu360Orders(limit = 50) {
  return prisma.yolcu360Order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listNewYolcu360OrdersForInbox(limit = 12) {
  return prisma.yolcu360Order.findMany({
    where: { adminSeenAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function upsertYolcu360OrderFromApi(
  apiOrder: ApiOrder,
  trackingId?: string,
  searchSnapshot?: unknown
) {
  const existing = await prisma.yolcu360Order.findUnique({
    where: { yolcu360OrderId: apiOrder.id },
  });

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

  const data = {
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
  };

  const row = await prisma.yolcu360Order.upsert({
    where: { yolcu360OrderId: apiOrder.id },
    create: {
      yolcu360OrderId: apiOrder.id,
      trackingId: trackingId ?? "",
      searchSnapshot: searchSnapshot as object | undefined,
      ...data,
    },
    update: data,
  });

  if (!existing && !row.staffNotifiedAt) {
    await notifyYolcu360OrderLead(row, "created");
    await prisma.yolcu360Order.update({
      where: { id: row.id },
      data: { staffNotifiedAt: new Date() },
    });
  }

  return row;
}

export async function syncYolcu360OrderStatus(orderId: string, status: string) {
  return prisma.yolcu360Order.update({
    where: { yolcu360OrderId: orderId },
    data: { status },
  });
}
