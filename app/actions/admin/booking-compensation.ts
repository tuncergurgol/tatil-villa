"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  appendBookingActivityLog,
  resolveActivityActor,
  type BookingActivityLogEntry,
} from "@/lib/booking-activity-log";
import { getIstanbulDateKey } from "@/lib/booking-calendar-days";
import { computeCompensationBreakdown } from "@/lib/booking-compensation";
import {
  computeGuestReservationTotal,
  parseBookingDetails,
} from "@/lib/booking-form-details";
import { formatMoneyPlain } from "@/lib/booking-display";
import { prisma } from "@/lib/db";
import { getBookingStatusLabel } from "@/lib/booking-status";

const inputSchema = z.object({
  bookingId: z.string().min(1),
  compensationAmount: z.number().finite().min(0),
  guestRefundAmount: z.number().finite().min(0),
});

export type ApplyCompensationResult =
  | {
      success: true;
      status: BookingStatus;
      message: string;
      activityLogs: BookingActivityLogEntry[];
      details: {
        compensationAmount: number;
        guestRefundAmount: number;
        guestRefundPaymentDate: string | null;
        ownerPayableAmount: number;
        commissionAmount: number;
        invoiceAmount: number;
        prepaymentAmount: number;
      };
    }
  | { success: false; error: string };

export async function applyCompensationAction(
  payload: z.infer<typeof inputSchema>
): Promise<ApplyCompensationResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);

  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Geçersiz tazminat bilgisi" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    select: {
      id: true,
      status: true,
      totalPrice: true,
      details: true,
      prepayments: { select: { amount: true } },
    },
  });

  if (!booking) {
    return { success: false, error: "Rezervasyon bulunamadı" };
  }

  const details = parseBookingDetails(booking.details);
  const realizedPrepayment = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const prepaymentTotal =
    realizedPrepayment > 0
      ? Math.round(realizedPrepayment)
      : Math.round(details.prepaymentAmount ?? 0);
  const reservationTotal =
    computeGuestReservationTotal(details) ??
    booking.totalPrice ??
    prepaymentTotal;

  const breakdown = computeCompensationBreakdown({
    reservationTotal,
    prepaymentTotal,
    compensationAmount: parsed.data.compensationAmount,
    guestRefundAmount: parsed.data.guestRefundAmount,
  });

  if (breakdown.compensationAmount <= 0 && prepaymentTotal > 0) {
    return {
      success: false,
      error: "Tazminat tutarı 0 olamaz",
    };
  }

  const guestRefundPaymentDate =
    breakdown.guestRefundAmount > 0 ? getIstanbulDateKey() : null;

  const nextDetails = {
    ...details,
    compensationAmount: breakdown.compensationAmount,
    guestRefundAmount: breakdown.guestRefundAmount,
    guestRefundPaymentDate,
    ownerPayableAmount: breakdown.ownerPayableAmount,
    commissionAmount: breakdown.commissionAmount,
    invoiceAmount: breakdown.compensationAmount,
    prepaymentAmount: breakdown.prepaymentTotal,
  };

  const previousStatus = booking.status;

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.COMPENSATION,
      details: nextDetails,
    },
  });

  const activityLogs = await appendBookingActivityLog(booking.id, {
    action: "compensation_applied",
    message: `Tazminat uygulandı (tazminat ${formatMoneyPlain(breakdown.compensationAmount)}, iade ${formatMoneyPlain(breakdown.guestRefundAmount)}, villa sahibi ${formatMoneyPlain(breakdown.ownerPayableAmount)})`,
    actorUserId: actor.actorUserId,
    actorName: actor.actorName,
    meta: {
      from: previousStatus,
      to: BookingStatus.COMPENSATION,
      compensationAmount: breakdown.compensationAmount,
      guestRefundAmount: breakdown.guestRefundAmount,
      guestRefundPaymentDate,
      ownerPayableAmount: breakdown.ownerPayableAmount,
      commissionAmount: breakdown.commissionAmount,
    },
  });

  revalidatePath("/admin/rezervasyonlar");

  return {
    success: true,
    status: BookingStatus.COMPENSATION,
    message: `Durum "${getBookingStatusLabel(BookingStatus.COMPENSATION)}" olarak güncellendi.`,
    activityLogs,
    details: {
      compensationAmount: breakdown.compensationAmount,
      guestRefundAmount: breakdown.guestRefundAmount,
      guestRefundPaymentDate,
      ownerPayableAmount: breakdown.ownerPayableAmount,
      commissionAmount: breakdown.commissionAmount,
      invoiceAmount: breakdown.compensationAmount,
      prepaymentAmount: breakdown.prepaymentTotal,
    },
  };
}
