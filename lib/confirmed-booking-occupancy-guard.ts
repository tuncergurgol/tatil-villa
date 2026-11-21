import { prisma } from "@/lib/db";
import {
  dbDateToDateKey,
  enumerateDateKeys,
} from "@/lib/villa-period-calendar";

/**
 * Onaylı rezervasyonların takvimde her zaman RESERVED (Bizim Rezervasyon)
 * kalması için korunan günler: dolu geceler [check-in, check-out).
 * Çıkış günü serbesttir; aynı gün sonraki kapama girebilir.
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
      if (dateKey === end) continue;
      protectedKeys.add(dateKey);
    }
  }
  return protectedKeys;
}
