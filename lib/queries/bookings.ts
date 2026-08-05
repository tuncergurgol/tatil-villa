import { BookingStatus, Prisma, StayStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BOOKING_BLOCKING_STATUSES } from "@/lib/booking-status";
import { isOccupancyNightBlocked } from "@/lib/booking-calendar-selection";
import { withAllocatedBookingNumber } from "@/lib/booking-number";
import { upsertCustomerFromBooking } from "@/lib/customer-from-booking";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import { getStayNightKeys } from "@/lib/stay-quote";
import { calculateNights } from "@/lib/stay-nights";
import { offsetDateKey } from "@/lib/villa-period-selection";
import { syncBookingStayOccupancy } from "@/lib/villa-occupancy-service";
import { handleBookingConfirmedTransition } from "@/lib/booking-excel-export";
import { processCompletedStayRewards } from "@/lib/loyalty-rewards";
import { normalizePhoneToE164 } from "@/lib/phone";

export { calculateNights };

async function syncBookingGuestToCustomer(data: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}) {
  await upsertCustomerFromBooking(data);
}

function toStayDateKey(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return dbDateToDateKey(value);
}

/**
 * Konaklama [checkIn, checkOut) — çıkış günü sonraki girişe açıktır.
 * Public takvimle aynı kaynak: VillaPricePeriodDay doluluğu.
 * Tüm geceler takvimde varsa BOOKED/OPTION dışında müsait kabul edilir
 * (çıkış sabahı EMPTY → yeni giriş yapılabilir).
 */
export async function isVillaAvailable(
  villaId: string,
  checkIn: Date | string,
  checkOut: Date | string,
  excludeBookingId?: string
) {
  const checkInKey = toStayDateKey(checkIn);
  const checkOutKey = toStayDateKey(checkOut);
  if (checkInKey >= checkOutKey) return false;

  const nightKeys = getStayNightKeys(checkInKey, checkOutKey);
  if (nightKeys.length === 0) return false;

  let excludedStay: { checkIn: string; checkOut: string } | null = null;
  if (excludeBookingId) {
    const excluded = await prisma.booking.findUnique({
      where: { id: excludeBookingId },
      select: { checkIn: true, checkOut: true },
    });
    if (excluded) {
      excludedStay = {
        checkIn: dbDateToDateKey(excluded.checkIn),
        checkOut: dbDateToDateKey(excluded.checkOut),
      };
    }
  }

  const calendarKeys = Array.from(
    new Set([
      offsetDateKey(checkInKey, -1),
      ...nightKeys,
      checkOutKey,
    ])
  );

  const periodDays = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId,
      date: { in: calendarKeys.map((key) => dateKeyToDbDate(key)) },
    },
    select: { date: true, occupancyStatus: true },
  });

  const occupancyByKey = new Map(
    periodDays.map((day) => [dbDateToDateKey(day.date), day.occupancyStatus])
  );

  const allNightsOnCalendar = nightKeys.every((key) =>
    occupancyByKey.has(key)
  );

  if (allNightsOnCalendar) {
    const excludedAllowStay = excludedStay
      ? { checkIn: excludedStay.checkIn, checkOut: excludedStay.checkOut }
      : null;
    for (const nightKey of nightKeys) {
      if (isOccupancyNightBlocked(occupancyByKey, nightKey, excludedAllowStay)) {
        return false;
      }
    }
    return true;
  }

  // Takvim günü eksikse rezervasyon kayıtlarıyla yarım-açık aralık kontrolü
  const bookings = await prisma.booking.findMany({
    where: {
      villaId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: BOOKING_BLOCKING_STATUSES },
      checkIn: { lt: dateKeyToDbDate(offsetDateKey(checkOutKey, 1)) },
      checkOut: { gt: dateKeyToDbDate(offsetDateKey(checkInKey, -1)) },
    },
    select: { checkIn: true, checkOut: true },
  });

  return !bookings.some((booking) => {
    const bookingIn = dbDateToDateKey(booking.checkIn);
    const bookingOut = dbDateToDateKey(booking.checkOut);
    return checkInKey < bookingOut && checkOutKey > bookingIn;
  });
}

export async function createBooking(data: {
  villaId: string;
  checkIn: Date | string;
  checkOut: Date | string;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalPrice?: number | null;
  details?: Record<string, unknown>;
}) {
  const villa = await prisma.villa.findUnique({ where: { id: data.villaId } });
  if (!villa) throw new Error("Villa bulunamadı.");

  const checkInKey = toStayDateKey(data.checkIn);
  const checkOutKey = toStayDateKey(data.checkOut);
  const checkInDate = dateKeyToDbDate(checkInKey);
  const checkOutDate = dateKeyToDbDate(checkOutKey);

  const totalGuests = data.adults + data.children;
  const maxCapacity = villa.guests + villa.extraCapacity;
  if (totalGuests > maxCapacity) {
    throw new Error(`Bu villa en fazla ${maxCapacity} kişi alabilir.`);
  }

  if (checkOutKey <= checkInKey) {
    throw new Error("Çıkış tarihi giriş tarihinden sonra olmalıdır.");
  }

  const available = await isVillaAvailable(
    data.villaId,
    checkInKey,
    checkOutKey
  );
  if (!available) {
    throw new Error("Seçilen tarihler için villa müsait değil.");
  }

  const nights = getStayNightKeys(checkInKey, checkOutKey).length;
  const totalPrice =
    data.totalPrice ??
    (villa.pricePerNight != null ? nights * villa.pricePerNight : null);

  const booking = await withAllocatedBookingNumber((externalCode, tx) =>
    tx.booking.create({
      data: {
        villaId: data.villaId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: data.adults,
        children: data.children,
        babies: data.babies,
        pets: data.pets,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        totalPrice,
        status: BookingStatus.NEW,
        externalCode,
        ...(data.details
          ? { details: data.details as Prisma.InputJsonValue }
          : {}),
      },
      include: { villa: { include: { region: true } } },
    })
  );

  const hasRealContact =
    Boolean(data.guestPhone?.trim()) ||
    (Boolean(data.guestEmail?.trim()) &&
      !data.guestEmail.trim().toLowerCase().endsWith("@tatildeyiz.local"));

  if (hasRealContact) {
    await syncBookingGuestToCustomer({
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
    });
  }

  return booking;
}

export async function createAdminBooking(data: {
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
  totalPrice?: number | null;
  status: BookingStatus;
  details?: Record<string, unknown>;
}) {
  if (data.checkOut <= data.checkIn) {
    throw new Error("Çıkış tarihi giriş tarihinden sonra olmalıdır.");
  }

  const villa = await prisma.villa.findUnique({ where: { id: data.villaId } });
  if (!villa) throw new Error("Villa bulunamadı.");

  const booking = await withAllocatedBookingNumber((externalCode, tx) =>
    tx.booking.create({
      data: {
        villaId: data.villaId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        adults: data.adults,
        children: data.children,
        babies: data.babies,
        pets: data.pets,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        totalPrice: data.totalPrice ?? null,
        status: data.status,
        externalCode,
        details: (data.details ?? {}) as Prisma.InputJsonValue,
      },
      include: {
        villa: {
          select: {
            id: true,
            villaId: true,
            slug: true,
            name: true,
            originalName: true,
            documentNo: true,
          },
        },
      },
    })
  );

  await syncBookingGuestToCustomer({
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
  });

  if (data.status === BookingStatus.CONFIRMED) {
    await syncBookingStayOccupancy({
      villaId: booking.villaId,
      previous: {
        status: BookingStatus.NEW,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
      },
      next: {
        status: BookingStatus.CONFIRMED,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
      },
    });
    await handleBookingConfirmedTransition(booking.id, null);
  }

  return booking;
}

export async function updateAdminBooking(
  id: string,
  data: {
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
    totalPrice?: number | null;
    status: BookingStatus;
    details?: Record<string, unknown>;
  }
) {
  if (data.checkOut <= data.checkIn) {
    throw new Error("Çıkış tarihi giriş tarihinden sonra olmalıdır.");
  }

  const existing = await prisma.booking.findUnique({
    where: { id },
    select: {
      status: true,
      villaId: true,
      checkIn: true,
      checkOut: true,
    },
  });

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      villaId: data.villaId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
      babies: data.babies,
      pets: data.pets,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      totalPrice: data.totalPrice ?? null,
      status: data.status,
      ...(data.details !== undefined
        ? { details: data.details as Prisma.InputJsonValue }
        : {}),
    },
  });

  await syncBookingGuestToCustomer({
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
  });

  if (existing) {
    await syncBookingStayOccupancy({
      villaId: existing.villaId,
      previous: {
        status: existing.status,
        checkIn: existing.checkIn,
        checkOut: existing.checkOut,
      },
      next: {
        status: data.status,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
      },
    });
  }

  if (
    data.status === BookingStatus.CONFIRMED &&
    existing?.status !== BookingStatus.CONFIRMED
  ) {
    await handleBookingConfirmedTransition(id, existing?.status ?? null);
  }

  return booking;
}

export async function updateBookingDetail(data: {
  id: string;
  status: BookingStatus;
  stayStatus: StayStatus;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalPrice: number | null;
  details: Record<string, unknown>;
}) {
  const existing = await prisma.booking.findUnique({
    where: { id: data.id },
    select: {
      status: true,
      stayStatus: true,
      memberId: true,
      villaId: true,
      checkIn: true,
      checkOut: true,
    },
  });
  if (!existing) {
    throw new Error("Rezervasyon bulunamadı");
  }

  const booking = await prisma.booking.update({
    where: { id: data.id },
    data: {
      status: data.status,
      stayStatus: data.stayStatus,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
      babies: data.babies,
      pets: data.pets,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      totalPrice: data.totalPrice,
      details: data.details as Prisma.InputJsonValue,
    },
  });

  await syncBookingStayOccupancy({
    villaId: existing.villaId,
    previous: {
      status: existing.status,
      checkIn: existing.checkIn,
      checkOut: existing.checkOut,
    },
    next: {
      status: data.status,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
    },
  });

  await syncBookingGuestToCustomer({
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
  });

  if (
    data.status === BookingStatus.CONFIRMED &&
    existing.status !== BookingStatus.CONFIRMED
  ) {
    await handleBookingConfirmedTransition(data.id, existing.status);
  }

  if (
    data.stayStatus === StayStatus.YAPILDI &&
    existing.stayStatus !== StayStatus.YAPILDI
  ) {
    let memberId = booking.memberId ?? existing.memberId;
    if (!memberId) {
      const phone = normalizePhoneToE164(data.guestPhone);
      if (phone) {
        const member = await prisma.memberAccount.findUnique({
          where: { phone },
          select: { id: true, customerId: true },
        });
        if (member) {
          memberId = member.id;
          await prisma.booking.update({
            where: { id: data.id },
            data: {
              memberId: member.id,
              customerId: member.customerId ?? undefined,
            },
          });
        }
      }
    }

    if (memberId) {
      const existingReward = await prisma.loyaltyVoucher.findFirst({
        where: { bookingId: data.id, type: "TIER_STAY" },
      });
      if (!existingReward) {
        const rewardedBooking = await prisma.booking.findUnique({
          where: { id: data.id },
        });
        if (rewardedBooking?.memberId) {
          await processCompletedStayRewards(rewardedBooking);
        }
      }
    }
  }

  return booking;
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
  const existing = await prisma.booking.findUnique({
    where: { id },
    select: {
      status: true,
      villaId: true,
      checkIn: true,
      checkOut: true,
    },
  });
  if (!existing) {
    throw new Error("Rezervasyon bulunamadı");
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
  });

  await syncBookingStayOccupancy({
    villaId: existing.villaId,
    previous: {
      status: existing.status,
      checkIn: existing.checkIn,
      checkOut: existing.checkOut,
    },
    next: {
      status,
      checkIn: existing.checkIn,
      checkOut: existing.checkOut,
    },
  });

  if (
    status === BookingStatus.CONFIRMED &&
    existing.status !== BookingStatus.CONFIRMED
  ) {
    await handleBookingConfirmedTransition(id, existing.status);
  }

  return booking;
}

/** ÖDEME BEKLENİYOR + opsiyon süresi dolmuş → İPTAL */
export async function cancelExpiredPrepaymentBookings(now = new Date()) {
  const result = await prisma.booking.updateMany({
    where: {
      status: BookingStatus.PREPAYMENT,
      optionExpiresAt: { lte: now },
    },
    data: {
      status: BookingStatus.CANCELLED,
    },
  });
  return result.count;
}

export async function cancelExpiredPrepaymentBookingById(
  id: string,
  now = new Date()
) {
  const result = await prisma.booking.updateMany({
    where: {
      id,
      status: BookingStatus.PREPAYMENT,
      optionExpiresAt: { lte: now },
    },
    data: {
      status: BookingStatus.CANCELLED,
    },
  });
  return result.count > 0;
}

export async function getBookingCount() {
  return prisma.booking.count();
}

export async function getPendingBookingCount() {
  return prisma.booking.count({ where: { status: BookingStatus.NEW } });
}
