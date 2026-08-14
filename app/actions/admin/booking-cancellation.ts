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
import {
  getCancellationReasonLabel,
  getForceMajeureRecipientLabel,
  isBookingCancellationReasonId,
  resolveForceMajeureRefundRecipient,
  type BookingCancellationReasonId,
  type ForceMajeureRefundRecipient,
} from "@/lib/booking-cancellation";
import {
  computeGuestReservationTotal,
  parseBookingDetails,
  type BookingDetails,
} from "@/lib/booking-form-details";
import { formatMoneyPlain } from "@/lib/booking-display";
import { prisma } from "@/lib/db";
import { getBookingStatusLabel } from "@/lib/booking-status";
import { updateBookingStatus } from "@/lib/queries/bookings";

const cancelInputSchema = z.object({
  bookingId: z.string().min(1),
  reasonId: z.string().min(1),
  forceMajeure: z.boolean().optional().default(false),
  refundAmount: z.number().finite().min(0).optional(),
});

export type CancelBookingResult =
  | {
      success: true;
      status: BookingStatus;
      message: string;
      activityLogs: BookingActivityLogEntry[];
      details: Partial<BookingDetails>;
    }
  | { success: false; error: string };

function toNonNegativeInt(value: number | null | undefined): number {
  return Math.max(0, Math.round(Number(value) || 0));
}

export async function cancelBookingAction(
  payload: z.infer<typeof cancelInputSchema>
): Promise<CancelBookingResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);

  const parsed = cancelInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Geçersiz iptal bilgisi" };
  }

  if (!isBookingCancellationReasonId(parsed.data.reasonId)) {
    return { success: false, error: "Geçersiz iptal nedeni" };
  }
  const reasonId = parsed.data.reasonId as BookingCancellationReasonId;

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
  const hasRealizedPrepayment = realizedPrepayment > 0;

  if (reasonId === "calendar_full" && hasRealizedPrepayment) {
    return {
      success: false,
      error: "Ön ödeme alınmış rezervasyonda Takvimi Dolu seçilemez",
    };
  }

  if (parsed.data.forceMajeure && !hasRealizedPrepayment) {
    return {
      success: false,
      error: "Mücbir sebep iadesi için gerçekleşen ön ödeme gerekir",
    };
  }

  const reasonLabel = getCancellationReasonLabel(reasonId);
  const todayKey = getIstanbulDateKey();
  const cancelledAt = new Date().toISOString();

  let nextDetails: BookingDetails = {
    ...details,
    cancellationReason: reasonId,
    cancellationHasCompensation: false,
    cancellationHasForceMajeure: Boolean(parsed.data.forceMajeure),
    cancelledAt,
  };

  const detailPatch: Partial<BookingDetails> = {
    cancellationReason: reasonId,
    cancellationHasCompensation: false,
    cancellationHasForceMajeure: Boolean(parsed.data.forceMajeure),
    cancelledAt,
  };

  let activityAction: "booking_cancelled" | "force_majeure_refund_applied" =
    "booking_cancelled";
  let activityMessage = `Rezervasyon iptal edildi (${reasonLabel})`;

  if (parsed.data.forceMajeure) {
    const prepaymentTotal = toNonNegativeInt(realizedPrepayment);
    const requested =
      parsed.data.refundAmount == null
        ? prepaymentTotal
        : toNonNegativeInt(parsed.data.refundAmount);
    const refundAmount = Math.min(prepaymentTotal, requested);
    const recipient: ForceMajeureRefundRecipient =
      resolveForceMajeureRefundRecipient(reasonId);
    const recipientLabel = getForceMajeureRecipientLabel(recipient);

    nextDetails = {
      ...nextDetails,
      forceMajeureRefundAmount: refundAmount,
      forceMajeureRefundRecipient: recipient,
      compensationAmount: 0,
      commissionAmount: details.commissionAmount ?? 0,
      invoiceAmount: 0,
      prepaymentAmount: prepaymentTotal,
      ...(recipient === "guest"
        ? {
            guestRefundAmount: refundAmount,
            guestRefundPaymentDate: refundAmount > 0 ? todayKey : null,
            ownerPayableAmount: 0,
            ownerPaymentDueDate: details.ownerPaymentDueDate ?? "",
          }
        : {
            ownerPayableAmount: refundAmount,
            ownerPaymentDueDate: refundAmount > 0 ? todayKey : "",
            guestRefundAmount: 0,
            guestRefundPaymentDate: null,
          }),
    };

    Object.assign(detailPatch, {
      forceMajeureRefundAmount: refundAmount,
      forceMajeureRefundRecipient: recipient,
      compensationAmount: 0,
      invoiceAmount: 0,
      prepaymentAmount: prepaymentTotal,
      guestRefundAmount: nextDetails.guestRefundAmount ?? 0,
      guestRefundPaymentDate: nextDetails.guestRefundPaymentDate ?? null,
      ownerPayableAmount: nextDetails.ownerPayableAmount ?? 0,
      ownerPaymentDueDate: nextDetails.ownerPaymentDueDate ?? "",
    });

    activityAction = "force_majeure_refund_applied";
    activityMessage = `Mücbir sebep iadesi uygulandı (${reasonLabel}, ${recipientLabel} ${formatMoneyPlain(refundAmount)})`;
  }

  const previousStatus = booking.status;

  // Occupancy sync için status helper; details ayrı yazılır
  if (previousStatus !== BookingStatus.CANCELLED) {
    await updateBookingStatus(booking.id, BookingStatus.CANCELLED);
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.CANCELLED,
      details: nextDetails,
    },
  });

  const activityLogs = await appendBookingActivityLog(booking.id, {
    action: activityAction,
    message: activityMessage,
    actorUserId: actor.actorUserId,
    actorName: actor.actorName,
    meta: {
      from: previousStatus,
      to: BookingStatus.CANCELLED,
      cancellationReason: reasonId,
      forceMajeure: Boolean(parsed.data.forceMajeure),
      refundAmount: detailPatch.forceMajeureRefundAmount ?? null,
      refundRecipient: detailPatch.forceMajeureRefundRecipient ?? null,
      reservationTotal:
        computeGuestReservationTotal(details) ?? booking.totalPrice ?? null,
    },
  });

  revalidatePath("/admin/rezervasyonlar");

  return {
    success: true,
    status: BookingStatus.CANCELLED,
    message: `Durum "${getBookingStatusLabel(BookingStatus.CANCELLED)}" olarak güncellendi.`,
    activityLogs,
    details: detailPatch,
  };
}
