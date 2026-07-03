import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

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
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
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

  return prisma.booking.create({
    data: {
      ...data,
      totalPrice,
      status: BookingStatus.PENDING,
    },
    include: { villa: { include: { region: true } } },
  });
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
  return prisma.booking.count({ where: { status: BookingStatus.PENDING } });
}
