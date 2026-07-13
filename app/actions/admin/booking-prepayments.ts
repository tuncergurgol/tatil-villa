"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  appendBookingActivityLog,
  resolveActivityActor,
  type BookingActivityLogEntry,
} from "@/lib/booking-activity-log";
import { formatMoneyPlain } from "@/lib/booking-display";
import type { BookingPrepaymentRecord } from "@/lib/booking-form-details";
import {
  getCompanyPaymentTypeLabel,
  normalizeCompanyPaymentType,
} from "@/lib/company-payment-types";
import { prisma } from "@/lib/db";

const createPrepaymentSchema = z.object({
  bookingId: z.string().min(1),
  paymentChannel: z.string().min(1, "Ödeme kanalı zorunludur"),
  bankAccountId: z.string().optional().nullable(),
  amount: z.number().positive("Ön ödeme tutarı zorunludur"),
});

export type BookingPrepaymentActionResult =
  | {
      success: true;
      prepayment: BookingPrepaymentRecord;
      activityLogs: BookingActivityLogEntry[];
    }
  | { success: false; error: string };

export type BookingPrepaymentDeleteResult =
  | { success: true; activityLogs: BookingActivityLogEntry[] }
  | { success: false; error: string };

export async function createBookingPrepaymentAction(
  payload: z.infer<typeof createPrepaymentSchema>
): Promise<BookingPrepaymentActionResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);

  const parsed = createPrepaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const data = parsed.data;
  const normalizedChannel = normalizeCompanyPaymentType(data.paymentChannel);

  if (normalizedChannel === "bank_transfer" && !data.bankAccountId?.trim()) {
    return {
      success: false,
      error: "Banka ödemeleri için ödeme yeri seçilmelidir",
    };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    select: { id: true },
  });

  if (!booking) {
    return { success: false, error: "Rezervasyon bulunamadı" };
  }

  if (data.bankAccountId) {
    const bankAccount = await prisma.companyBankAccount.findFirst({
      where: {
        id: data.bankAccountId,
        active: true,
        paymentType: "bank_transfer",
      },
      select: { id: true },
    });
    if (!bankAccount) {
      return { success: false, error: "Banka hesabı bulunamadı" };
    }
  }

  const prepayment = await prisma.$transaction(async (tx) => {
    const created = await tx.bookingPrepayment.create({
      data: {
        bookingId: data.bookingId,
        paymentChannel: normalizedChannel || data.paymentChannel,
        bankAccountId:
          normalizedChannel === "bank_transfer"
            ? data.bankAccountId ?? null
            : null,
        amount: Math.round(data.amount),
      },
      include: {
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            accountHolder: true,
            iban: true,
          },
        },
      },
    });

    await tx.booking.update({
      where: { id: data.bookingId },
      data: { optionExpiresAt: null },
    });

    return created;
  });

  const channelLabel = getCompanyPaymentTypeLabel(prepayment.paymentChannel);
  const activityLogs = await appendBookingActivityLog(data.bookingId, {
    action: "prepayment_created",
    message: `Ön ödeme kaydı eklendi (${formatMoneyPlain(prepayment.amount)}${channelLabel ? ` · ${channelLabel}` : ""})`,
    actorUserId: actor.actorUserId,
    actorName: actor.actorName,
    meta: {
      prepaymentId: prepayment.id,
      amount: prepayment.amount,
      paymentChannel: prepayment.paymentChannel,
    },
  });

  revalidatePath("/admin/rezervasyonlar");

  return {
    success: true,
    prepayment: {
      id: prepayment.id,
      paymentChannel: prepayment.paymentChannel,
      bankAccountId: prepayment.bankAccountId,
      amount: prepayment.amount,
      createdAt: prepayment.createdAt,
      bankAccount: prepayment.bankAccount,
    },
    activityLogs,
  };
}

export async function getBookingPrepaymentsAction(bookingId: string) {
  await requireAdmin();

  const items = await prisma.bookingPrepayment.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    include: {
      bankAccount: {
        select: {
          id: true,
          bankName: true,
          accountHolder: true,
          iban: true,
        },
      },
    },
  });

  return items.map(
    (item): BookingPrepaymentRecord => ({
      id: item.id,
      paymentChannel: item.paymentChannel,
      bankAccountId: item.bankAccountId,
      amount: item.amount,
      createdAt: item.createdAt,
      bankAccount: item.bankAccount,
    })
  );
}

export async function getBookingBankAccountsAction() {
  await requireAdmin();

  return prisma.companyBankAccount.findMany({
    where: {
      active: true,
      paymentType: "bank_transfer",
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      paymentType: true,
      bankName: true,
      accountHolder: true,
      iban: true,
    },
  });
}

const updatePrepaymentSchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  paymentChannel: z.string().min(1, "Ödeme kanalı zorunludur"),
  bankAccountId: z.string().optional().nullable(),
  amount: z.number().positive("Ön ödeme tutarı zorunludur"),
});

export async function updateBookingPrepaymentAction(
  payload: z.infer<typeof updatePrepaymentSchema>
): Promise<BookingPrepaymentActionResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);

  const parsed = updatePrepaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const data = parsed.data;
  const normalizedChannel = normalizeCompanyPaymentType(data.paymentChannel);

  if (normalizedChannel === "bank_transfer" && !data.bankAccountId?.trim()) {
    return {
      success: false,
      error: "Banka ödemeleri için ödeme yeri seçilmelidir",
    };
  }

  const existing = await prisma.bookingPrepayment.findFirst({
    where: { id: data.id, bookingId: data.bookingId },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: "Ön ödeme kaydı bulunamadı" };
  }

  if (data.bankAccountId) {
    const bankAccount = await prisma.companyBankAccount.findFirst({
      where: {
        id: data.bankAccountId,
        active: true,
        paymentType: "bank_transfer",
      },
      select: { id: true },
    });
    if (!bankAccount) {
      return { success: false, error: "Banka hesabı bulunamadı" };
    }
  }

  const prepayment = await prisma.bookingPrepayment.update({
    where: { id: data.id },
    data: {
      paymentChannel: normalizedChannel || data.paymentChannel,
      bankAccountId:
        normalizedChannel === "bank_transfer"
          ? data.bankAccountId ?? null
          : null,
      amount: Math.round(data.amount),
    },
    include: {
      bankAccount: {
        select: {
          id: true,
          bankName: true,
          accountHolder: true,
          iban: true,
        },
      },
    },
  });

  revalidatePath("/admin/rezervasyonlar");

  const channelLabel = getCompanyPaymentTypeLabel(prepayment.paymentChannel);
  const activityLogs = await appendBookingActivityLog(data.bookingId, {
    action: "prepayment_updated",
    message: `Ön ödeme kaydı güncellendi (${formatMoneyPlain(prepayment.amount)}${channelLabel ? ` · ${channelLabel}` : ""})`,
    actorUserId: actor.actorUserId,
    actorName: actor.actorName,
    meta: {
      prepaymentId: prepayment.id,
      amount: prepayment.amount,
      paymentChannel: prepayment.paymentChannel,
    },
  });

  return {
    success: true,
    prepayment: {
      id: prepayment.id,
      paymentChannel: prepayment.paymentChannel,
      bankAccountId: prepayment.bankAccountId,
      amount: prepayment.amount,
      createdAt: prepayment.createdAt,
      bankAccount: prepayment.bankAccount,
    },
    activityLogs,
  };
}

export async function deleteBookingPrepaymentAction(payload: {
  id: string;
  bookingId: string;
}): Promise<BookingPrepaymentDeleteResult> {
  const session = await requireAdmin();
  const actor = await resolveActivityActor(session.user);

  const id = payload.id?.trim();
  const bookingId = payload.bookingId?.trim();
  if (!id || !bookingId) {
    return { success: false, error: "Geçersiz ön ödeme kaydı" };
  }

  const existing = await prisma.bookingPrepayment.findFirst({
    where: { id, bookingId },
    select: { id: true, amount: true, paymentChannel: true },
  });

  if (!existing) {
    return { success: false, error: "Ön ödeme kaydı bulunamadı" };
  }

  await prisma.bookingPrepayment.delete({ where: { id } });

  const channelLabel = getCompanyPaymentTypeLabel(existing.paymentChannel);
  const activityLogs = await appendBookingActivityLog(bookingId, {
    action: "prepayment_deleted",
    message: `Ön ödeme kaydı silindi (${formatMoneyPlain(existing.amount)}${channelLabel ? ` · ${channelLabel}` : ""})`,
    actorUserId: actor.actorUserId,
    actorName: actor.actorName,
    meta: {
      prepaymentId: existing.id,
      amount: existing.amount,
      paymentChannel: existing.paymentChannel,
    },
  });

  revalidatePath("/admin/rezervasyonlar");

  return { success: true, activityLogs };
}
