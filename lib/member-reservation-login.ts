import { BookingStatus } from "@prisma/client";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import { prisma } from "@/lib/db";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
} from "@/lib/phone";

export const MEMBER_RESERVATION_ALLOWED_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMATION_SENT,
  BookingStatus.CONFIRMED,
];

export function normalizeMemberLoginEmail(value: string) {
  return value.trim().toLowerCase();
}

export function parseMemberReservationCode(value: string): number | null {
  const digits = value.trim().replace(/\s+/g, "");
  if (!/^\d{4,10}$/.test(digits)) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function findMemberReservationBooking(
  email: string,
  reservationCode: number
) {
  const booking = await prisma.booking.findFirst({
    where: {
      externalCode: reservationCode,
      guestEmail: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      guestEmail: true,
      guestPhone: true,
      guestName: true,
      status: true,
      externalCode: true,
    },
  });

  if (!booking) return null;
  if (isImportedPlaceholderEmail(booking.guestEmail)) return null;
  if (!MEMBER_RESERVATION_ALLOWED_STATUSES.includes(booking.status)) return null;

  const phone = normalizePhoneToE164(booking.guestPhone);
  if (!phone || !isValidTurkishMobileE164(phone)) return null;

  return { ...booking, phone };
}
