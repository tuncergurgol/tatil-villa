"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  buildActivityLogEntry,
  normalizeActivityLogs,
  resolveActivityActor,
  type BookingActivityLogEntry,
} from "@/lib/booking-activity-log";
import { formatMoneyPlain } from "@/lib/booking-display";
import {
  normalizeOwnerPayments,
  parseBookingDetails,
  resolveBookingCommissionAmount,
  type BookingOwnerPaymentRecord,
} from "@/lib/booking-form-details";
import { prisma } from "@/lib/db";
import { resolveOwnerPayableCap } from "@/lib/owner-payment-schedule";

const createSchema = z.object({
  bookingId: z.string().min(1),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ödeme tarihi zorunludur"),
  amount: z.number().positive("Ödenen tutar zorunludur"),
});

const updateSchema = createSchema.extend({
  paymentId: z.string().min(1),
});

const deleteSchema = z.object({
  bookingId: z.string().min(1),
  paymentId: z.string().min(1),
});

export type BookingOwnerPaymentActionResult =
  | {
      success: true;
      ownerPayments: BookingOwnerPaymentRecord[];
      activityLogs: BookingActivityLogEntry[];
    }
  | { success: false; error: string };

async function loadOwnerPayments(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      details: true,
      status: true,
      totalPrice: true,
      prepayments: { select: { amount: true } },
    },
  });
  if (!booking) return null;
  const details = parseBookingDetails(booking.details);
  const realizedPrepayment = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const ownerPayableCap = resolveOwnerPayableCap({
    status: booking.status,
    realizedPrepayment,
    commissionAmount: resolveBookingCommissionAmount(
      details,
      booking.totalPrice
    ),
    storedOwnerPayableAmount: details.ownerPayableAmount,
  });
  return { details, ownerPayableCap };
}

function assertWithinPayableCap(
  ownerPayments: BookingOwnerPaymentRecord[],
  ownerPayableCap: number
): string | null {
  const paidTotal = ownerPayments.reduce((sum, row) => sum + row.amount, 0);
  if (paidTotal > ownerPayableCap) {
    return `Villa sahibine ödenecek tutardan (${formatMoneyPlain(ownerPayableCap)}) fazla ödeme yapılamaz.`;
  }
  return null;
}

async function saveOwnerPayments(
  bookingId: string,
  details: ReturnType<typeof parseBookingDetails>,
  ownerPayments: BookingOwnerPaymentRecord[],
  activityLogs: BookingActivityLogEntry[]
) {
  const paidTotal = ownerPayments.reduce((sum, row) => sum + row.amount, 0);
  const latestPaidAt =
    ownerPayments.length > 0
      ? ownerPayments[ownerPayments.length - 1]?.paidAt ?? ""
      : "";

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      details: {
        ...details,
        ownerPayments,
        ownerPaidAmount: paidTotal > 0 ? paidTotal : null,
        ownerPaymentDate: latestPaidAt,
        activityLogs,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/rezervasyonlar");
  revalidatePath("/admin/raporlar/ev-sahibi-odemeleri");
  return { ownerPayments, activityLogs };
}

export async function createBookingOwnerPaymentAction(
  payload: z.infer<typeof createSchema>
): Promise<BookingOwnerPaymentActionResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const loaded = await loadOwnerPayments(parsed.data.bookingId);
  if (!loaded) return { success: false, error: "Rezervasyon bulunamadı" };

  const amount = Math.round(parsed.data.amount);
  const next: BookingOwnerPaymentRecord[] = [
    ...normalizeOwnerPayments(loaded.details.ownerPayments),
    {
      id: crypto.randomUUID(),
      paidAt: parsed.data.paidAt,
      amount,
      createdAt: new Date().toISOString(),
    },
  ];
  const normalizedNext = normalizeOwnerPayments(next);
  const capError = assertWithinPayableCap(
    normalizedNext,
    loaded.ownerPayableCap
  );
  if (capError) return { success: false, error: capError };

  const activityLogs = [
    ...normalizeActivityLogs(loaded.details.activityLogs),
    buildActivityLogEntry({
      action: "owner_payment_created",
      message: `Villa sahibine ödeme eklendi (${formatMoneyPlain(amount)})`,
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
      meta: { amount, paidAt: parsed.data.paidAt },
    }),
  ];

  return {
    success: true,
    ...(await saveOwnerPayments(
      parsed.data.bookingId,
      loaded.details,
      normalizedNext,
      activityLogs
    )),
  };
}

export async function updateBookingOwnerPaymentAction(
  payload: z.infer<typeof updateSchema>
): Promise<BookingOwnerPaymentActionResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const loaded = await loadOwnerPayments(parsed.data.bookingId);
  if (!loaded) return { success: false, error: "Rezervasyon bulunamadı" };

  const existing = normalizeOwnerPayments(loaded.details.ownerPayments);
  if (!existing.some((row) => row.id === parsed.data.paymentId)) {
    return { success: false, error: "Ödeme kaydı bulunamadı" };
  }

  const amount = Math.round(parsed.data.amount);
  const next = existing.map((row) =>
    row.id === parsed.data.paymentId
      ? {
          ...row,
          paidAt: parsed.data.paidAt,
          amount,
        }
      : row
  );
  const normalizedNext = normalizeOwnerPayments(next);
  const capError = assertWithinPayableCap(
    normalizedNext,
    loaded.ownerPayableCap
  );
  if (capError) return { success: false, error: capError };

  const activityLogs = [
    ...normalizeActivityLogs(loaded.details.activityLogs),
    buildActivityLogEntry({
      action: "owner_payment_updated",
      message: `Villa sahibine ödeme güncellendi (${formatMoneyPlain(amount)})`,
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
      meta: {
        paymentId: parsed.data.paymentId,
        amount,
        paidAt: parsed.data.paidAt,
      },
    }),
  ];

  return {
    success: true,
    ...(await saveOwnerPayments(
      parsed.data.bookingId,
      loaded.details,
      normalizedNext,
      activityLogs
    )),
  };
}

export async function deleteBookingOwnerPaymentAction(
  payload: z.infer<typeof deleteSchema>
): Promise<BookingOwnerPaymentActionResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);
  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const loaded = await loadOwnerPayments(parsed.data.bookingId);
  if (!loaded) return { success: false, error: "Rezervasyon bulunamadı" };

  const existing = normalizeOwnerPayments(loaded.details.ownerPayments);
  const removed = existing.find((row) => row.id === parsed.data.paymentId);
  const next = existing.filter((row) => row.id !== parsed.data.paymentId);

  const activityLogs = [
    ...normalizeActivityLogs(loaded.details.activityLogs),
    buildActivityLogEntry({
      action: "owner_payment_deleted",
      message: removed
        ? `Villa sahibine ödeme silindi (${formatMoneyPlain(removed.amount)})`
        : "Villa sahibine ödeme silindi",
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
      meta: {
        paymentId: parsed.data.paymentId,
        amount: removed?.amount ?? null,
      },
    }),
  ];

  return {
    success: true,
    ...(await saveOwnerPayments(
      parsed.data.bookingId,
      loaded.details,
      next,
      activityLogs
    )),
  };
}
