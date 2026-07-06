import { BookingStatus, Prisma, StayStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BOOKING_BLOCKING_STATUSES } from "@/lib/booking-status";
import { upsertCustomerFromBooking } from "@/lib/customer-from-booking";

async function syncBookingGuestToCustomer(data: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}) {
  await upsertCustomerFromBooking(data);
}

export async function isVillaAvailable(
  villaId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
) {
  const conflict = await prisma.booking.findFirst({
    where: {
      villaId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: BOOKING_BLOCKING_STATUSES },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });
  return !conflict;
}

export function calculateNights(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function createBooking(data: {
  villaId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}) {
  const villa = await prisma.villa.findUnique({ where: { id: data.villaId } });
  if (!villa) throw new Error("Villa bulunamadı.");

  const totalGuests = data.adults + data.children;
  if (totalGuests > villa.guests) {
    throw new Error(`Bu villa en fazla ${villa.guests} kişi alabilir.`);
  }

  if (data.checkOut <= data.checkIn) {
    throw new Error("Çıkış tarihi giriş tarihinden sonra olmalıdır.");
  }

  const available = await isVillaAvailable(data.villaId, data.checkIn, data.checkOut);
  if (!available) {
    throw new Error("Seçilen tarihler için villa müsait değil.");
  }

  const nights = calculateNights(data.checkIn, data.checkOut);
  const totalPrice =
    villa.pricePerNight != null ? nights * villa.pricePerNight : null;

  const booking = await prisma.booking.create({
    data: {
      ...data,
      totalPrice,
      status: BookingStatus.NEW,
    },
    include: { villa: { include: { region: true } } },
  });

  await syncBookingGuestToCustomer({
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
  });

  return booking;
}

export async function createAdminBooking(data: {
  villaId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalPrice?: number | null;
  status: BookingStatus;
  details?: Record<string, unknown>;
}) {
  if (data.checkOut <= data.checkIn) {
    throw new Error("Çıkış tarihi giriş tarihinden sonra olmalıdır.");
  }

  const villa = await prisma.villa.findUnique({ where: { id: data.villaId } });
  if (!villa) throw new Error("Villa bulunamadı.");

  const booking = await prisma.booking.create({
    data: {
      villaId: data.villaId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
      babies: data.babies,
      pets: data.pets,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      totalPrice: data.totalPrice ?? null,
      status: data.status,
      details: (data.details ?? {}) as Prisma.InputJsonValue,
    },
    include: {
      villa: {
        select: {
          id: true,
          villaId: true,
          slug: true,
          name: true,
          originalName: true,
          documentNo: true,
        },
      },
    },
  });

  await syncBookingGuestToCustomer({
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
  });

  return booking;
}

export async function updateAdminBooking(
  id: string,
  data: {
    villaId: string;
    checkIn: Date;
    checkOut: Date;
    adults: number;
    children: number;
    babies: number;
    pets: number;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    totalPrice?: number | null;
    status: BookingStatus;
    details?: Record<string, unknown>;
  }
) {
  if (data.checkOut <= data.checkIn) {
    throw new Error("Çıkış tarihi giriş tarihinden sonra olmalıdır.");
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      villaId: data.villaId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
      babies: data.babies,
      pets: data.pets,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      totalPrice: data.totalPrice ?? null,
      status: data.status,
      ...(data.details !== undefined
        ? { details: data.details as Prisma.InputJsonValue }
        : {}),
    },
  });

  await syncBookingGuestToCustomer({
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
  });

  return booking;
}

export async function updateBookingDetail(data: {
  id: string;
  status: BookingStatus;
  stayStatus: StayStatus;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  babies: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalPrice: number | null;
  details: Record<string, unknown>;
}) {
  const booking = await prisma.booking.update({
    where: { id: data.id },
    data: {
      status: data.status,
      stayStatus: data.stayStatus,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
      babies: data.babies,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      totalPrice: data.totalPrice,
      details: data.details as Prisma.InputJsonValue,
    },
  });

  await syncBookingGuestToCustomer({
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
  });

  return booking;
}

export async function getAllBookings() {
  return prisma.booking.findMany({
    include: { villa: { include: { region: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: { villa: { include: { region: true } } },
  });
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  return prisma.booking.update({
    where: { id },
    data: { status },
  });
}

export async function getBookingCount() {
  return prisma.booking.count();
}

export async function getPendingBookingCount() {
  return prisma.booking.count({ where: { status: BookingStatus.NEW } });
}
