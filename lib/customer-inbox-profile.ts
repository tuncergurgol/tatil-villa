import { prisma } from "@/lib/db";
import { findCustomerByPhone } from "@/lib/customer-crm";
import { LOYALTY_TIER_META } from "@/lib/loyalty-config";
import { BOOKING_STATUS_META } from "@/lib/booking-status";
import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";
import type { BookingStatus, LoyaltyTier } from "@prisma/client";

export type CustomerInboxReservation = {
  id: string;
  code: string;
  villaName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  statusClass: string;
  totalPrice: string;
};

export type CustomerInboxProfile = {
  name: string;
  phone: string;
  email: string;
  customerId: string | null;
  blacklisted: boolean;
  loyaltyLabel: string | null;
  loyaltyEmoji: string | null;
  couponBalance: number | null;
  completedStays: number | null;
  reservations: CustomerInboxReservation[];
};

function formatStayDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return `${value.toLocaleString("tr-TR")} TL`;
}

export async function getCustomerInboxProfile(input: {
  customerId?: string | null;
  phoneDigits?: string | null;
  name?: string | null;
}): Promise<CustomerInboxProfile> {
  const phoneDigits = normalizeTurkishPhoneDigits(input.phoneDigits ?? "");
  const customer =
    (input.customerId
      ? await prisma.customer.findUnique({
          where: { id: input.customerId },
          select: { id: true, fullName: true, phone: true, email: true, blacklisted: true },
        })
      : null) ??
    (phoneDigits.length >= 10 ? await findCustomerByPhone(phoneDigits) : null);

  const memberFilters = [
    ...(customer ? [{ customerId: customer.id }] : []),
    ...(phoneDigits.length >= 10 ? [{ phone: { endsWith: phoneDigits } }] : []),
  ];
  const member = memberFilters.length
    ? await prisma.memberAccount.findFirst({
        where: { OR: memberFilters },
        select: {
          loyaltyTier: true,
          couponBalance: true,
          completedStays: true,
        },
      })
    : null;

  const tier = member?.loyaltyTier as LoyaltyTier | undefined;
  const phoneBookingIds =
    phoneDigits.length >= 10
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT id
          FROM "Booking"
          WHERE right(regexp_replace("guestPhone", '\\D', '', 'g'), 10) = ${phoneDigits}
          ORDER BY "checkIn" DESC
          LIMIT 8
        `
      : [];

  const bookingFilters = [
    ...(customer ? [{ customerId: customer.id }] : []),
    ...(phoneBookingIds.length
      ? [{ id: { in: phoneBookingIds.map((row) => row.id) } }]
      : []),
  ];
  const bookings = await prisma.booking.findMany({
    where: bookingFilters.length ? { OR: bookingFilters } : { id: "__none__" },
    orderBy: { checkIn: "desc" },
    take: 8,
    select: {
      id: true,
      externalCode: true,
      checkIn: true,
      checkOut: true,
      status: true,
      totalPrice: true,
      villa: { select: { name: true } },
    },
  });

  return {
    name: customer?.fullName?.trim() || input.name?.trim() || "Misafir",
    phone: customer?.phone || input.phoneDigits || "",
    email: customer?.email?.trim() || "",
    customerId: customer?.id ?? null,
    blacklisted: customer?.blacklisted ?? false,
    loyaltyLabel: tier ? LOYALTY_TIER_META[tier].label : null,
    loyaltyEmoji: tier ? LOYALTY_TIER_META[tier].emoji : null,
    couponBalance: member?.couponBalance ?? null,
    completedStays: member?.completedStays ?? null,
    reservations: bookings.map((booking) => {
      const meta = BOOKING_STATUS_META[booking.status as BookingStatus];
      return {
        id: booking.id,
        code: booking.externalCode ? String(booking.externalCode) : "—",
        villaName: booking.villa.name,
        checkIn: formatStayDate(booking.checkIn),
        checkOut: formatStayDate(booking.checkOut),
        status: meta.label,
        statusClass: meta.className,
        totalPrice: formatMoney(booking.totalPrice),
      };
    }),
  };
}
