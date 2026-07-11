"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createBooking } from "@/lib/queries/bookings";
import { normalizeStoredTurkishPhone } from "@/lib/phone-utils";

const bookingSchema = z.object({
  villaId: z.string().min(1),
  checkIn: z.string().min(1, "Giriş tarihi gerekli"),
  checkOut: z.string().min(1, "Çıkış tarihi gerekli"),
  adults: z.coerce.number().min(1, "En az 1 yetişkin gerekli"),
  children: z.coerce.number().min(0).default(0),
  babies: z.coerce.number().min(0).default(0),
  pets: z.coerce.number().min(0).default(0),
  guestName: z.string().min(2, "Ad soyad gerekli"),
  guestEmail: z.string().email("Geçerli e-posta girin"),
  guestPhone: z
    .string()
    .min(1, "Geçerli telefon girin")
    .transform((value) => normalizeStoredTurkishPhone(value))
    .refine((value) => value.length >= 12, "Geçerli telefon girin"),
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const { checkIn, checkOut, ...rest } = parsed.data;

  try {
    const booking = await createBooking({
      ...rest,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
    });
    redirect(`/rezervasyon/basarili?id=${booking.id}`);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Rezervasyon oluşturulamadı",
    };
  }
}
