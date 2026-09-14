import { BookingStatus, StayStatus } from "@prisma/client";
import {
  getIstanbulDateKey,
  toDbDateKey,
} from "@/lib/booking-calendar-days";
import { prisma } from "@/lib/db";
import { processCompletedStayRewards } from "@/lib/loyalty-rewards";
import { normalizePhoneToE164 } from "@/lib/phone";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";

export type StayStatusAutoCompleteResult = {
  ok: true;
  todayKey: string;
  updatedCount: number;
  rewardedCount: number;
  bookingIds: string[];
};

async function applyStayCompletedSideEffects(bookingId: string): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!booking || booking.stayStatus !== StayStatus.YAPILDI) {
    return false;
  }

  let memberId = booking.memberId;
  if (!memberId) {
    const phone = normalizePhoneToE164(booking.guestPhone);
    if (phone) {
      const member = await prisma.memberAccount.findUnique({
        where: { phone },
        select: { id: true, customerId: true },
      });
      if (member) {
        memberId = member.id;
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            memberId: member.id,
            customerId: member.customerId ?? undefined,
          },
        });
      }
    }
  }

  if (!memberId) return false;

  const existingReward = await prisma.loyaltyVoucher.findFirst({
    where: { bookingId, type: "TIER_STAY" },
    select: { id: true },
  });
  if (existingReward) return false;

  const rewardedBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!rewardedBooking?.memberId) return false;

  await processCompletedStayRewards(rewardedBooking);
  return true;
}

/**
 * ONAYLANDI + konaklama henüz YAPILDI değil kayıtları YAPILDI yapar.
 * - catchUpPast: giriş günü bugünden önce
 * - checkInToday: giriş günü bugün (İstanbul)
 */
export async function runStayStatusAutoComplete(options?: {
  catchUpPast?: boolean;
  checkInToday?: boolean;
  now?: Date;
}): Promise<StayStatusAutoCompleteResult> {
  const now = options?.now ?? new Date();
  const todayKey = getIstanbulDateKey(now);
  const catchUpPast = options?.catchUpPast !== false;
  const checkInToday = options?.checkInToday !== false;
  const todayDb = dateKeyToDbDate(todayKey);

  const orFilters: Array<{ checkIn: { lt: Date } | { equals: Date } }> = [];
  if (catchUpPast) {
    orFilters.push({ checkIn: { lt: todayDb } });
  }
  if (checkInToday) {
    orFilters.push({ checkIn: { equals: todayDb } });
  }

  if (orFilters.length === 0) {
    return {
      ok: true,
      todayKey,
      updatedCount: 0,
      rewardedCount: 0,
      bookingIds: [],
    };
  }

  const candidates = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      stayStatus: { not: StayStatus.YAPILDI },
      OR: orFilters,
    },
    select: { id: true, checkIn: true },
    orderBy: { checkIn: "asc" },
  });

  if (candidates.length === 0) {
    return {
      ok: true,
      todayKey,
      updatedCount: 0,
      rewardedCount: 0,
      bookingIds: [],
    };
  }

  const bookingIds = candidates.map((row) => row.id);
  await prisma.booking.updateMany({
    where: { id: { in: bookingIds } },
    data: { stayStatus: StayStatus.YAPILDI },
  });

  let rewardedCount = 0;
  for (const id of bookingIds) {
    try {
      const rewarded = await applyStayCompletedSideEffects(id);
      if (rewarded) rewardedCount += 1;
    } catch (error) {
      console.error("[stay-status-auto-complete] sadakat yan etki hatası", {
        bookingId: id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  console.info("[stay-status-auto-complete]", {
    todayKey,
    updatedCount: bookingIds.length,
    rewardedCount,
    sampleCheckIns: candidates.slice(0, 5).map((row) => toDbDateKey(row.checkIn)),
  });

  return {
    ok: true,
    todayKey,
    updatedCount: bookingIds.length,
    rewardedCount,
    bookingIds,
  };
}
