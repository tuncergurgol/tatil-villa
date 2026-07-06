"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { normalizeCompanyPaymentType } from "@/lib/company-payment-types";
import { prisma } from "@/lib/db";
import type { BookingPrepaymentRecord } from "@/lib/booking-form-details";

const createPrepaymentSchema = z.object({
  bookingId: z.string().min(1),
  paymentChannel: z.string().min(1, "Ödeme kanalı zorunludur"),
  bankAccountId: z.string().optional().nullable(),
  amount: z.number().positive("Ön ödeme tutarı zorunludur"),
});

export type BookingPrepaymentActionResult =
  | { success: true; prepayment: BookingPrepaymentRecord }
  | { success: false; error: string };

export async function createBookingPrepaymentAction(
  payload: z.infer<typeof createPrepaymentSchema>
): Promise<BookingPrepaymentActionResult> {
  await requireAdmin();

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
      where: { id: data.bankAccountId, active: true },
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
    where: { active: true },
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
