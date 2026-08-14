import { prisma } from "@/lib/db";
import { normalizeGuestEmail } from "@/lib/booking-guest-contact";
import {
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "@/lib/phone-utils";

export type CustomerLookupResult = {
  fullName: string;
  email: string;
  contactChannelId: string | null;
  source: "customer" | "booking";
};

export async function lookupCustomerByPhone(
  phone: string
): Promise<CustomerLookupResult | null> {
  const stored = normalizeStoredTurkishPhone(phone);
  const digits = normalizeTurkishPhoneDigits(phone);
  if (!digits || digits.length < 10) return null;

  const customer = await prisma.customer.findFirst({
    where: {
      active: true,
      OR: [{ phone: stored }, { phone: { endsWith: digits } }],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      fullName: true,
      email: true,
      contactChannelId: true,
    },
  });

  if (customer) {
    return {
      fullName: customer.fullName,
      email: customer.email,
      contactChannelId: customer.contactChannelId,
      source: "customer",
    };
  }

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [{ guestPhone: stored }, { guestPhone: { contains: digits } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      guestName: true,
      guestEmail: true,
    },
  });

  if (!booking) return null;

  return {
    fullName: booking.guestName,
    email: normalizeGuestEmail(booking.guestEmail),
    contactChannelId: null,
    source: "booking",
  };
}
