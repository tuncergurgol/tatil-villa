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
  normalizeGuestRefundPayments,
  parseBookingDetails,
  type BookingOwnerPaymentRecord,
} from "@/lib/booking-form-details";
import { prisma } from "@/lib/db";

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

export type BookingGuestRefundPaymentActionResult =
  | {
      success: true;
      guestRefundPayments: BookingOwnerPaymentRecord[];
      activityLogs: BookingActivityLogEntry[];
    }
  | { success: false; error: string };

async function loadGuestRefundPayments(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      details: true,
      prepayments: { select: { amount: true } },
    },
  });
  if (!booking) return null;
  const details = parseBookingDetails(booking.details);
  const realizedPrepayment = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const refundCap = Math.max(
    0,
    realizedPrepayment > 0
      ? Math.round(Number(details.guestRefundAmount) || 0)
      : 0
  );
  return { details, refundCap };
}

function assertWithinRefundCap(
  payments: BookingOwnerPaymentRecord[],
  refundCap: number
): string | null {
  const paidTotal = payments.reduce((sum, row) => sum + row.amount, 0);
  if (paidTotal > refundCap) {
    return `Misafire iade edilecek tutardan (${formatMoneyPlain(refundCap)}) fazla ödeme yapılamaz.`;
  }
  return null;
}

async function saveGuestRefundPayments(
  bookingId: string,
  details: ReturnType<typeof parseBookingDetails>,
  guestRefundPayments: BookingOwnerPaymentRecord[],
  activityLogs: BookingActivityLogEntry[]
) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      details: {
        ...details,
        guestRefundPayments,
        activityLogs,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/rezervasyonlar");
  revalidatePath("/admin/raporlar/ev-sahibi-odemeleri");
  return { guestRefundPayments, activityLogs };
}

export async function createBookingGuestRefundPaymentAction(
  payload: z.infer<typeof createSchema>
): Promise<BookingGuestRefundPaymentActionResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const loaded = await loadGuestRefundPayments(parsed.data.bookingId);
  if (!loaded) return { success: false, error: "Rezervasyon bulunamadı" };
  if (loaded.refundCap <= 0) {
    return { success: false, error: "Misafire iade tutarı tanımlı değil" };
  }

  const amount = Math.round(parsed.data.amount);
  const next: BookingOwnerPaymentRecord[] = [
    ...normalizeGuestRefundPayments(loaded.details.guestRefundPayments),
    {
      id: crypto.randomUUID(),
      paidAt: parsed.data.paidAt,
      amount,
      createdAt: new Date().toISOString(),
    },
  ];
  const normalizedNext = normalizeGuestRefundPayments(next);
  const capError = assertWithinRefundCap(normalizedNext, loaded.refundCap);
  if (capError) return { success: false, error: capError };

  const activityLogs = [
    ...normalizeActivityLogs(loaded.details.activityLogs),
    buildActivityLogEntry({
      action: "guest_refund_payment_created",
      message: `Misafire iade ödemesi eklendi (${formatMoneyPlain(amount)})`,
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
      meta: { amount, paidAt: parsed.data.paidAt },
    }),
  ];

  return {
    success: true,
    ...(await saveGuestRefundPayments(
      parsed.data.bookingId,
      loaded.details,
      normalizedNext,
      activityLogs
    )),
  };
}

export async function updateBookingGuestRefundPaymentAction(
  payload: z.infer<typeof updateSchema>
): Promise<BookingGuestRefundPaymentActionResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const loaded = await loadGuestRefundPayments(parsed.data.bookingId);
  if (!loaded) return { success: false, error: "Rezervasyon bulunamadı" };

  const existing = normalizeGuestRefundPayments(
    loaded.details.guestRefundPayments
  );
  if (!existing.some((row) => row.id === parsed.data.paymentId)) {
    return { success: false, error: "Ödeme kaydı bulunamadı" };
  }

  const amount = Math.round(parsed.data.amount);
  const next = existing.map((row) =>
    row.id === parsed.data.paymentId
      ? { ...row, paidAt: parsed.data.paidAt, amount }
      : row
  );
  const normalizedNext = normalizeGuestRefundPayments(next);
  const capError = assertWithinRefundCap(normalizedNext, loaded.refundCap);
  if (capError) return { success: false, error: capError };

  const activityLogs = [
    ...normalizeActivityLogs(loaded.details.activityLogs),
    buildActivityLogEntry({
      action: "guest_refund_payment_updated",
      message: `Misafire iade ödemesi güncellendi (${formatMoneyPlain(amount)})`,
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
    ...(await saveGuestRefundPayments(
      parsed.data.bookingId,
      loaded.details,
      normalizedNext,
      activityLogs
    )),
  };
}

export async function deleteBookingGuestRefundPaymentAction(
  payload: z.infer<typeof deleteSchema>
): Promise<BookingGuestRefundPaymentActionResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);
  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const loaded = await loadGuestRefundPayments(parsed.data.bookingId);
  if (!loaded) return { success: false, error: "Rezervasyon bulunamadı" };

  const existing = normalizeGuestRefundPayments(
    loaded.details.guestRefundPayments
  );
  const removed = existing.find((row) => row.id === parsed.data.paymentId);
  const next = existing.filter((row) => row.id !== parsed.data.paymentId);

  const activityLogs = [
    ...normalizeActivityLogs(loaded.details.activityLogs),
    buildActivityLogEntry({
      action: "guest_refund_payment_deleted",
      message: removed
        ? `Misafire iade ödemesi silindi (${formatMoneyPlain(removed.amount)})`
        : "Misafire iade ödemesi silindi",
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
    ...(await saveGuestRefundPayments(
      parsed.data.bookingId,
      loaded.details,
      next,
      activityLogs
    )),
  };
}
