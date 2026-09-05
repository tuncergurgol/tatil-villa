import { BookingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  resolveCustomerLoyaltyTier,
  resolveCustomerStayCount,
} from "@/lib/customer-loyalty";
import { LOYALTY_TIER_META } from "@/lib/loyalty-config";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import { normalizePhoneToE164 } from "@/lib/phone";
import {
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "@/lib/phone-utils";
import {
  buildReturningGuestWelcome,
  firstNameFromFullName,
  higherLoyaltyTier,
  shouldAutoApplyLoyaltyDiscount,
  raiseAgencyDiscountForLoyalty,
  type ReturningGuestMatch,
} from "@/lib/returning-guest-shared";

export {
  buildReturningGuestWelcome,
  firstNameFromFullName,
  higherLoyaltyTier,
  raiseAgencyDiscountForLoyalty,
  shouldAutoApplyLoyaltyDiscount,
  splitFullName,
  toReturningGuestPreview,
  type ReturningGuestMatch,
  type ReturningGuestPreview,
} from "@/lib/returning-guest-shared";

function phoneSearchKeys(phoneRaw: string): {
  e164: string;
  stored: string;
  digits: string;
} | null {
  const digits = normalizeTurkishPhoneDigits(phoneRaw);
  if (digits.length < 10) return null;
  const e164 = normalizePhoneToE164(phoneRaw) || `+90${digits}`;
  const stored = normalizeStoredTurkishPhone(phoneRaw) || e164;
  return { e164, stored, digits };
}

export async function findMemberByPhoneOrEmail(input: {
  phone?: string;
  email?: string;
}) {
  const keys = input.phone ? phoneSearchKeys(input.phone) : null;
  const email = input.email ? input.email.trim().toLowerCase() : "";

  if (keys) {
    const byPhone = await prisma.memberAccount.findFirst({
      where: {
        OR: [
          { phone: keys.e164 },
          { phone: keys.stored },
          { phone: { endsWith: keys.digits } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    if (byPhone) return byPhone;
  }

  if (email && email.includes("@") && !isImportedPlaceholderEmail(email)) {
    return prisma.memberAccount.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
    });
  }

  return null;
}

export async function findCustomerByPhoneOrEmail(input: {
  phone?: string;
  email?: string;
}) {
  const keys = input.phone ? phoneSearchKeys(input.phone) : null;
  const email = input.email ? input.email.trim().toLowerCase() : "";

  if (keys) {
    const byPhone = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: keys.e164 },
          { phone: keys.stored },
          { phone: { endsWith: keys.digits } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        tags: { select: { tag: { select: { name: true } } } },
        memberAccount: { select: { id: true } },
      },
    });
    if (byPhone) return byPhone;
  }

  if (email && email.includes("@") && !isImportedPlaceholderEmail(email)) {
    return prisma.customer.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      include: {
        tags: { select: { tag: { select: { name: true } } } },
        memberAccount: { select: { id: true } },
      },
    });
  }

  return null;
}

function bookingContactWhere(input: {
  phone?: string;
  email?: string;
  customerId?: string | null;
}): Prisma.BookingWhereInput | null {
  const keys = input.phone ? phoneSearchKeys(input.phone) : null;
  const email = input.email ? input.email.trim().toLowerCase() : "";
  const or: Prisma.BookingWhereInput[] = [];

  if (input.customerId) {
    or.push({ customerId: input.customerId });
  }
  if (keys) {
    or.push({ guestPhone: keys.e164 });
    or.push({ guestPhone: keys.stored });
    or.push({ guestPhone: { endsWith: keys.digits } });
  }
  if (email && email.includes("@") && !isImportedPlaceholderEmail(email)) {
    or.push({ guestEmail: { equals: email, mode: "insensitive" } });
  }
  if (or.length === 0) return null;
  return { OR: or };
}

async function countConfirmedStaysByContact(input: {
  phone?: string;
  email?: string;
  customerId?: string | null;
}): Promise<number> {
  const contactWhere = bookingContactWhere(input);
  if (!contactWhere) return 0;

  return prisma.booking.count({
    where: {
      status: BookingStatus.CONFIRMED,
      ...contactWhere,
    },
  });
}

async function findLatestBookingByContact(input: {
  phone?: string;
  email?: string;
  customerId?: string | null;
}) {
  const contactWhere = bookingContactWhere(input);
  if (!contactWhere) return null;

  return prisma.booking.findFirst({
    where: contactWhere,
    orderBy: { createdAt: "desc" },
    select: {
      guestName: true,
      guestEmail: true,
      guestPhone: true,
    },
  });
}

export async function recognizeReturningGuest(input: {
  phone?: string;
  email?: string;
}): Promise<ReturningGuestMatch | null> {
  const phone = input.phone?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  if (!phone && !email) return null;

  const [member, customer] = await Promise.all([
    findMemberByPhoneOrEmail({ phone, email }),
    findCustomerByPhoneOrEmail({ phone, email }),
  ]);

  const customerId = customer?.id ?? member?.customerId ?? null;
  const contact = { phone, email, customerId };
  const [bookingCount, latestBooking] = await Promise.all([
    countConfirmedStaysByContact(contact),
    findLatestBookingByContact(contact),
  ]);

  if (!member && !customer && !latestBooking) return null;

  const stayCount = resolveCustomerStayCount({
    bookingCount: Math.max(bookingCount, member?.completedStays ?? 0),
    tags: customer?.tags.map((entry) => entry.tag) ?? [],
  });
  const loyaltyTier = higherLoyaltyTier(
    resolveCustomerLoyaltyTier(
      Math.max(stayCount, member?.completedStays ?? 0)
    ),
    member?.loyaltyTier ?? "BRONZE"
  );

  const fullName =
    (member?.fullName || customer?.fullName || latestBooking?.guestName || "").trim() ||
    "Misafir";

  const welcome = buildReturningGuestWelcome({
    fullName,
    loyaltyTier,
    stayCount,
  });

  return {
    fullName,
    firstName: firstNameFromFullName(fullName),
    email: member?.email || customer?.email || latestBooking?.guestEmail || email,
    phone: member?.phone || customer?.phone || latestBooking?.guestPhone || phone,
    loyaltyTier,
    discountPercent: LOYALTY_TIER_META[loyaltyTier].voucherPercent,
    stayCount,
    hasMemberAccount: Boolean(member),
    memberId: member?.id ?? customer?.memberAccount?.id ?? null,
    customerId,
    welcomeTitle: welcome.welcomeTitle,
    welcomeBody: welcome.welcomeBody,
  };
}

export async function applyLoyaltyFloorToBookingDetails<
  T extends {
    agencyDiscountRate?: number | null;
    agencyDiscountAmount?: number | null;
    grossPrice?: number | null;
  },
>(input: {
  guestPhone?: string;
  guestEmail?: string;
  details: T;
}): Promise<{ details: T; match: ReturningGuestMatch | null; raised: boolean }> {
  const match = await recognizeReturningGuest({
    phone: input.guestPhone,
    email: input.guestEmail,
  });
  if (!match || !shouldAutoApplyLoyaltyDiscount(match)) {
    return { details: input.details, match, raised: false };
  }

  const next = raiseAgencyDiscountForLoyalty({
    grossPrice: input.details.grossPrice,
    agencyDiscountRate: input.details.agencyDiscountRate ?? 0,
    agencyDiscountAmount: input.details.agencyDiscountAmount ?? 0,
    loyaltyPercent: match.discountPercent,
  });
  if (!next.raised) {
    return { details: input.details, match, raised: false };
  }

  return {
    match,
    raised: true,
    details: {
      ...input.details,
      agencyDiscountRate: next.agencyDiscountRate,
      agencyDiscountAmount: next.agencyDiscountAmount,
    },
  };
}
