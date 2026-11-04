import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeGuestEmail } from "@/lib/booking-guest-contact";
import {
  resolveCustomerLoyaltyTier,
  resolveCustomerStayCount,
} from "@/lib/customer-loyalty";
import { LOYALTY_TIER_META } from "@/lib/loyalty-config";
import {
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "@/lib/phone-utils";

export type CustomerLookupResult = {
  fullName: string;
  email: string;
  contactChannelId: string | null;
  contactChannelName: string | null;
  hasPreviousReservation: boolean;
  /** Sadakat sınıfının konaklama bedeline hak ettiği indirim oranı. */
  loyaltyDiscountRate: number;
  source: "customer" | "booking";
};

function loyaltyRateForStays(stayCount: number): number {
  if (stayCount <= 0) return 0;
  const tier = resolveCustomerLoyaltyTier(stayCount);
  return LOYALTY_TIER_META[tier].voucherPercent;
}

export async function lookupCustomerByPhone(
  phone: string
): Promise<CustomerLookupResult | null> {
  const stored = normalizeStoredTurkishPhone(phone);
  const digits = normalizeTurkishPhoneDigits(phone);
  if (!digits || digits.length < 10) return null;

  const phoneMatch = {
    OR: [{ guestPhone: stored }, { guestPhone: { contains: digits } }],
  };

  const customer = await prisma.customer.findFirst({
    where: {
      active: true,
      OR: [{ phone: stored }, { phone: { endsWith: digits } }],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      contactChannelId: true,
      contactChannel: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  if (customer) {
    const [confirmedStays, openReservations] = await Promise.all([
      prisma.booking.count({
        where: {
          status: BookingStatus.CONFIRMED,
          OR: [{ customerId: customer.id }, phoneMatch],
        },
      }),
      prisma.booking.count({
        where: {
          OR: [{ customerId: customer.id }, phoneMatch],
        },
      }),
    ]);
    const stayCount = resolveCustomerStayCount({
      bookingCount: confirmedStays,
      tags: customer.tags.map((entry) => entry.tag),
    });

    return {
      fullName: customer.fullName,
      email: customer.email,
      contactChannelId: customer.contactChannelId,
      contactChannelName: customer.contactChannel?.name ?? null,
      hasPreviousReservation: openReservations > 0,
      loyaltyDiscountRate: loyaltyRateForStays(stayCount),
      source: "customer",
    };
  }

  const booking = await prisma.booking.findFirst({
    where: phoneMatch,
    orderBy: { createdAt: "desc" },
    select: {
      guestName: true,
      guestEmail: true,
    },
  });

  if (!booking) return null;

  const confirmedStays = await prisma.booking.count({
    where: { ...phoneMatch, status: BookingStatus.CONFIRMED },
  });

  return {
    fullName: booking.guestName,
    email: normalizeGuestEmail(booking.guestEmail),
    contactChannelId: null,
    contactChannelName: null,
    hasPreviousReservation: true,
    loyaltyDiscountRate: loyaltyRateForStays(confirmedStays),
    source: "booking",
  };
}
