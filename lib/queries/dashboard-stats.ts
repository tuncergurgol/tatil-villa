import "server-only";

import { BookingStatus } from "@prisma/client";
import { addDays, startOfDay } from "@/lib/booking-calendar-days";
import { prisma } from "@/lib/db";

export type DashboardBookingStatusStats = {
  newCount: number;
  prepaymentCount: number;
  confirmationSentCount: number;
  confirmedCount: number;
};

export type DashboardBookingQuickStats = {
  checkIn2Days: number;
  checkIn1Day: number;
  checkInToday: number;
  checkOut2Days: number;
  checkOut1Day: number;
  checkOutToday: number;
};

export async function getDashboardBookingStatusStats(): Promise<DashboardBookingStatusStats> {
  const [newCount, prepaymentCount, confirmationSentCount, confirmedCount] =
    await Promise.all([
      prisma.booking.count({ where: { status: BookingStatus.NEW } }),
      prisma.booking.count({ where: { status: BookingStatus.PREPAYMENT } }),
      prisma.booking.count({
        where: { status: BookingStatus.CONFIRMATION_SENT },
      }),
      prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    ]);

  return {
    newCount,
    prepaymentCount,
    confirmationSentCount,
    confirmedCount,
  };
}

export async function getDashboardBookingQuickStats(): Promise<DashboardBookingQuickStats> {
  const today = startOfDay(new Date());
  const confirmed = BookingStatus.CONFIRMED;

  const [
    checkIn2Days,
    checkIn1Day,
    checkInToday,
    checkOut2Days,
    checkOut1Day,
    checkOutToday,
  ] = await Promise.all([
    prisma.booking.count({
      where: { status: confirmed, checkIn: addDays(today, 2) },
    }),
    prisma.booking.count({
      where: { status: confirmed, checkIn: addDays(today, 1) },
    }),
    prisma.booking.count({
      where: { status: confirmed, checkIn: today },
    }),
    prisma.booking.count({
      where: { status: confirmed, checkOut: addDays(today, 2) },
    }),
    prisma.booking.count({
      where: { status: confirmed, checkOut: addDays(today, 1) },
    }),
    prisma.booking.count({
      where: { status: confirmed, checkOut: today },
    }),
  ]);

  return {
    checkIn2Days,
    checkIn1Day,
    checkInToday,
    checkOut2Days,
    checkOut1Day,
    checkOutToday,
  };
}

export async function getDashboardUnansweredCallbackCount(): Promise<number> {
  return prisma.callbackRequest.count({
    where: {
      status: { in: ["VERIFIED", "NEW"] },
    },
  });
}
