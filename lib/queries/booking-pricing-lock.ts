import { BookingStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildPricingSnapshot,
  parseBookingDetails,
  parsePricingSnapshot,
  type BookingPricingSnapshot,
} from "@/lib/booking-form-details";

/**
 * ONAYLANDI rezervasyonun fiyat kalemlerini dondurur.
 *
 * - Kayıt zaten kilitliyse hiçbir şey değiştirmez (idempotent).
 * - Kilit alanı boş eski onaylı kayıtlar için mevcut değerlerden snapshot üretir,
 *   böylece geriye dönük uyum bozulmadan koruma başlar.
 */
export async function lockBookingPricingIfConfirmed(
  bookingId: string,
  actorUserId?: string | null
): Promise<BookingPricingSnapshot | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      status: true,
      totalPrice: true,
      details: true,
      pricingLockedAt: true,
    },
  });

  if (!booking || booking.status !== BookingStatus.CONFIRMED) return null;

  const details = parseBookingDetails(booking.details);
  const existingSnapshot = parsePricingSnapshot(details.pricingSnapshot);
  if (booking.pricingLockedAt != null && existingSnapshot) {
    return existingSnapshot;
  }

  const snapshot =
    existingSnapshot ?? buildPricingSnapshot(details, booking.totalPrice);
  const lockedAt = booking.pricingLockedAt ?? new Date();

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      pricingLockedAt: lockedAt,
      ...(actorUserId ? { pricingLockedById: actorUserId } : {}),
      details: {
        ...details,
        pricingSnapshot: snapshot,
        pricingSnapshotAt: lockedAt.toISOString(),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return snapshot;
}

/**
 * Yönetici onaylı fiyat değişikliğinden sonra kilit damgasını yeniler.
 * Snapshot `details` içinde kaydedildiği için burada yalnızca sürüm/damga artar.
 */
export async function bumpBookingPricingVersion(
  bookingId: string,
  actorUserId?: string | null
): Promise<void> {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      pricingLockedAt: new Date(),
      pricingLockedById: actorUserId ?? null,
      pricingVersion: { increment: 1 },
    },
  });
}
