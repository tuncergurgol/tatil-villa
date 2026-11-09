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
  /** Sadakat Programı üyesi değilse 0. */
  loyaltyDiscountRate: number;
  source: "customer" | "booking";
};

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
      memberAccount: {
        select: {
          id: true,
          active: true,
          membershipAcceptedAt: true,
          completedStays: true,
          loyaltyTier: true,
        },
      },
    },
  });

  if (customer) {
    const openReservations = await prisma.booking.count({
      where: {
        OR: [{ customerId: customer.id }, phoneMatch],
      },
    });

    // Sadakat indirimi yalnızca Sadakat Programı üyeliği varsa uygulanır.
    const member = customer.memberAccount;
    const isLoyaltyMember = Boolean(
      member?.active && member.membershipAcceptedAt
    );
    const loyaltyDiscountRate = isLoyaltyMember
      ? LOYALTY_TIER_META[
          resolveCustomerLoyaltyTier(
            resolveCustomerStayCount({
              bookingCount: member?.completedStays ?? 0,
              tags: customer.tags.map((entry) => entry.tag),
            })
          )
        ].voucherPercent
      : 0;

    return {
      fullName: customer.fullName,
      email: customer.email,
      contactChannelId: customer.contactChannelId,
      contactChannelName: customer.contactChannel?.name ?? null,
      hasPreviousReservation: openReservations > 0,
      loyaltyDiscountRate,
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

  // Rezervasyon eşleşmesi tek başına sadakat indirimi açmaz.
  return {
    fullName: booking.guestName,
    email: normalizeGuestEmail(booking.guestEmail),
    contactChannelId: null,
    contactChannelName: null,
    hasPreviousReservation: true,
    loyaltyDiscountRate: 0,
    source: "booking",
  };
}
