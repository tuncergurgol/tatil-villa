"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createBooking } from "@/lib/queries/bookings";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";
import { normalizeStoredTurkishPhone } from "@/lib/phone-utils";

const bookingSchema = z.object({
  villaId: z.string().min(1),
  checkIn: z.string().min(1, "Giriş tarihi gerekli"),
  checkOut: z.string().min(1, "Çıkış tarihi gerekli"),
  adults: z.coerce.number().min(1, "En az 1 yetişkin gerekli"),
  children: z.coerce.number().min(0).default(0),
  babies: z.coerce.number().min(0).default(0),
  pets: z.coerce.number().min(0).max(3).default(0),
  guestName: z.string().min(2, "Ad soyad gerekli"),
  guestEmail: z.string().email("Geçerli e-posta girin"),
  guestPhone: z
    .string()
    .min(1, "Geçerli telefon girin")
    .transform((value) => normalizeStoredTurkishPhone(value))
    .refine((value) => value.length >= 12, "Geçerli telefon girin"),
  paymentMethod: z.enum(["card", "transfer"]).default("transfer"),
  paymentAmount: z.enum(["prepayment", "full"]).default("prepayment"),
  totalPrice: z.coerce.number().optional(),
  prepaymentAmount: z.coerce.number().optional(),
  prepaymentRate: z.coerce.number().optional(),
  acceptMarketing: z
    .enum(["true", "false", "on", "off", ""])
    .optional()
    .transform((value) => value === "true" || value === "on"),
});

export type BookingActionState = {
  error?: string;
  success?: boolean;
  bookingId?: string;
};

export async function submitBooking(
  _prevState: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse({
    villaId: formData.get("villaId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults"),
    children: formData.get("children") ?? 0,
    babies: formData.get("babies") ?? 0,
    pets: formData.get("pets") ?? 0,
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    guestPhone: formData.get("guestPhone"),
    paymentMethod: formData.get("paymentMethod") ?? "transfer",
    paymentAmount: formData.get("paymentAmount") ?? "prepayment",
    totalPrice: formData.get("totalPrice") || undefined,
    prepaymentAmount: formData.get("prepaymentAmount") || undefined,
    prepaymentRate: formData.get("prepaymentRate") || undefined,
    acceptMarketing: formData.get("acceptMarketing") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const {
    checkIn,
    checkOut,
    guestName,
    guestEmail,
    guestPhone,
    paymentMethod,
    paymentAmount,
    totalPrice,
    prepaymentAmount,
    prepaymentRate,
    acceptMarketing,
    ...rest
  } = parsed.data;

  let booking;
  try {
    booking = await createBooking({
      ...rest,
      checkIn: dateKeyToDbDate(checkIn),
      checkOut: dateKeyToDbDate(checkOut),
      guestName,
      guestEmail,
      guestPhone,
      totalPrice: totalPrice ?? null,
      details: {
        paymentMethod,
        paymentAmount,
        prepaymentAmount: prepaymentAmount ?? null,
        prepaymentRate: prepaymentRate ?? null,
        checkInPayment:
          totalPrice != null && prepaymentAmount != null
            ? Math.max(0, totalPrice - prepaymentAmount)
            : null,
        acceptMarketing: acceptMarketing ?? false,
        source: "public_pre_reservation",
      },
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Rezervasyon oluşturulamadı",
    };
  }

  redirect(`/rezervasyon/basarili?id=${booking.id}`);
}
