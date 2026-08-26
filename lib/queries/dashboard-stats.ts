import "server-only";

import { BookingStatus } from "@prisma/client";
import { resolveQuickFilterPrismaDate } from "@/lib/booking-calendar-days";
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
  checkInYesterday: number;
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
  const confirmed = BookingStatus.CONFIRMED;

  const [
    checkIn2Days,
    checkIn1Day,
    checkInToday,
    checkInYesterday,
    checkOut2Days,
    checkOut1Day,
    checkOutToday,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        status: confirmed,
        checkIn: resolveQuickFilterPrismaDate("check_in_2_days"),
      },
    }),
    prisma.booking.count({
      where: {
        status: confirmed,
        checkIn: resolveQuickFilterPrismaDate("check_in_1_day"),
      },
    }),
    prisma.booking.count({
      where: {
        status: confirmed,
        checkIn: resolveQuickFilterPrismaDate("check_in_today"),
      },
    }),
    prisma.booking.count({
      where: {
        status: confirmed,
        checkIn: resolveQuickFilterPrismaDate("check_in_yesterday"),
      },
    }),
    prisma.booking.count({
      where: {
        status: confirmed,
        checkOut: resolveQuickFilterPrismaDate("check_out_2_days"),
      },
    }),
    prisma.booking.count({
      where: {
        status: confirmed,
        checkOut: resolveQuickFilterPrismaDate("check_out_1_day"),
      },
    }),
    prisma.booking.count({
      where: {
        status: confirmed,
        checkOut: resolveQuickFilterPrismaDate("check_out_today"),
      },
    }),
  ]);

  return {
    checkIn2Days,
    checkIn1Day,
    checkInToday,
    checkInYesterday,
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

export type DashboardIntegrationLeadStats = {
  newObiletInquiries: number;
  newYolcu360Orders: number;
  newFacebookLeads: number;
};

export async function getDashboardIntegrationLeadStats(): Promise<DashboardIntegrationLeadStats> {
  const [newObiletInquiries, newYolcu360Orders, newFacebookLeads] =
    await Promise.all([
      prisma.biletallInquiry.count({ where: { adminSeenAt: null } }),
      prisma.yolcu360Order.count({ where: { adminSeenAt: null } }),
      prisma.facebookLead.count({ where: { adminSeenAt: null } }),
    ]);

  return { newObiletInquiries, newYolcu360Orders, newFacebookLeads };
}

export async function getDashboardPendingGuestReviewCount(): Promise<number> {
  return prisma.guestReview.count({
    where: {
      approved: false,
      rejectedReason: "",
    },
  });
}
