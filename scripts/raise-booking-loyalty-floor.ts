/**
 * Kayıtlı misafirin sadakat oranını rezervasyona taban olarak uygular (düşürmez).
 * Çalıştır: npx tsx scripts/raise-booking-loyalty-floor.ts "İrfan Alp"
 *          npx tsx scripts/raise-booking-loyalty-floor.ts 116099
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import {
  computeCheckInPayment,
  computePayableReservationTotal,
  computePrepaymentAmount,
  parseBookingDetails,
} from "../lib/booking-form-details";
import {
  buildActivityLogEntry,
  normalizeActivityLogs,
} from "../lib/booking-activity-log-core";
import { applyLoyaltyFloorToBookingDetails } from "../lib/returning-guest";
import { formatBookingReservationNo } from "../lib/booking-display";

const query = process.argv.slice(2).join(" ").trim();

async function main() {
  if (!query) {
    throw new Error("İsim veya rezervasyon numarası gerekli");
  }

  const reservationNo = Number(query.replace(/\D/g, ""));
  const where: Prisma.BookingWhereInput =
    Number.isFinite(reservationNo) && reservationNo > 0 && /^\d+$/.test(query.trim())
      ? { externalCode: reservationNo }
      : {
          guestName: { contains: query, mode: "insensitive" },
          createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        };

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      externalCode: true,
      guestName: true,
      guestPhone: true,
      guestEmail: true,
      totalPrice: true,
      memberId: true,
      details: true,
      createdAt: true,
    },
  });

  if (bookings.length === 0) {
    console.log("kayıt yok");
    return;
  }

  for (const booking of bookings) {
    const details = parseBookingDetails(booking.details);
    const before = {
      rate: details.agencyDiscountRate ?? 0,
      amount: details.agencyDiscountAmount ?? 0,
      total: booking.totalPrice,
    };
    const floor = await applyLoyaltyFloorToBookingDetails({
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      details,
    });

    const result = {
      reservation: formatBookingReservationNo(booking.externalCode),
      guest: booking.guestName,
      createdAt: booking.createdAt.toISOString(),
      before,
      match: floor.match
        ? {
            tier: floor.match.loyaltyTier,
            stays: floor.match.stayCount,
            percent: floor.match.discountPercent,
            memberId: floor.match.memberId,
          }
        : null,
      raised: floor.raised,
    };

    if (!floor.raised || !floor.match) {
      console.log(JSON.stringify(result, null, 2));
      continue;
    }

    const floored = floor.details;
    const nextPrepayment =
      computePrepaymentAmount(
        floored.grossPrice,
        floored.ownerDiscountAmount ?? floored.discountAmount ?? 0,
        floored.prepaymentRate,
        floored.agencyDiscountAmount ?? 0,
        floored.prepaymentAmount
      ) ?? floored.prepaymentAmount;
    const withPrepay = {
      ...floored,
      prepaymentAmount: nextPrepayment,
      memberLoyaltyTier: floor.match.loyaltyTier,
    };
    const nextDetails = {
      ...withPrepay,
      checkInPayment: computeCheckInPayment(withPrepay),
      activityLogs: normalizeActivityLogs([
        ...normalizeActivityLogs(details.activityLogs),
        buildActivityLogEntry({
          action: "booking_updated",
          message: `Sadakat sınıfı hatırlandı: ${floor.match.welcomeTitle} — acente indirimi %${floor.match.discountPercent}`,
          actorName: "Sistem",
        }),
      ]),
    };
    const nextTotal = computePayableReservationTotal(nextDetails);

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        details: nextDetails as Prisma.InputJsonValue,
        ...(nextTotal != null ? { totalPrice: nextTotal } : {}),
        ...(floor.match.memberId && !booking.memberId
          ? { memberId: floor.match.memberId }
          : {}),
        ...(floor.match.customerId
          ? { customerId: floor.match.customerId }
          : {}),
      },
    });

    console.log(
      JSON.stringify(
        {
          ...result,
          after: {
            rate: nextDetails.agencyDiscountRate ?? 0,
            amount: nextDetails.agencyDiscountAmount ?? 0,
            total: nextTotal,
            prepayment: nextDetails.prepaymentAmount ?? 0,
            checkIn: nextDetails.checkInPayment ?? 0,
          },
        },
        null,
        2
      )
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
