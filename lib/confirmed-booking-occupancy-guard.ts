import { prisma } from "@/lib/db";
import {
  dbDateToDateKey,
  enumerateDateKeys,
} from "@/lib/villa-period-calendar";

/**
 * Onaylı rezervasyonların takvimde her zaman RESERVED (Bizim Rezervasyon)
 * kalması için korunan günler: check-in .. check-out (dahil).
 */
export async function loadConfirmedBookingProtectedDateKeys(
  villaId: string
): Promise<Set<string>> {
  const bookings = await prisma.booking.findMany({
    where: {
      villaId,
      status: "CONFIRMED",
    },
    select: {
      checkIn: true,
      checkOut: true,
    },
  });

  const protectedKeys = new Set<string>();
  for (const booking of bookings) {
    const start = dbDateToDateKey(booking.checkIn);
    const end = dbDateToDateKey(booking.checkOut);
    for (const dateKey of enumerateDateKeys(start, end)) {
      protectedKeys.add(dateKey);
    }
  }
  return protectedKeys;
}
