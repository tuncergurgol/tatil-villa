"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { StayStatus } from "@/lib/stay-status";
import { z } from "zod";
import {
  createAdminBooking,
  updateAdminBooking,
  updateBookingDetail,
  updateBookingStatus,
} from "@/lib/queries/bookings";
import { getAdminBookingDetail } from "@/lib/queries/admin-booking-detail";
import {
  resolveBookingPeriodFees,
  resolveBookingPrepaymentRate,
} from "@/lib/queries/booking-prepayment";
import { requireAdmin } from "@/lib/auth-helpers";
import type { BookingDetails } from "@/lib/booking-form-details";

const bookingStatusSchema = z.nativeEnum(BookingStatus);

const adminBookingSchema = z.object({
  villaId: z.string().min(1, "Villa seçin"),
  checkIn: z.string().min(1, "Giriş tarihi gerekli"),
  checkOut: z.string().min(1, "Çıkış tarihi gerekli"),
  adults: z.coerce.number().min(1, "En az 1 yetişkin gerekli"),
  children: z.coerce.number().min(0).default(0),
  babies: z.coerce.number().min(0).default(0),
  pets: z.coerce.number().min(0).default(0),
  guestName: z.string().min(2, "Ad soyad gerekli"),
  guestEmail: z.string().min(3, "E-posta gerekli"),
  guestPhone: z.string().min(1, "Telefon gerekli"),
  totalPrice: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null || value === "") return null;
      const parsed = Number(String(value).replace(/\./g, "").replace(",", "."));
      return Number.isFinite(parsed) ? Math.round(parsed) : null;
    }),
  status: bookingStatusSchema,
});

export type AdminBookingActionState = {
  success?: boolean;
  error?: string;
};

function parseAdminBookingForm(formData: FormData) {
  return adminBookingSchema.safeParse({
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
    totalPrice: formData.get("totalPrice"),
    status: formData.get("status"),
  });
}

export async function createAdminBookingAction(
  _prevState: AdminBookingActionState,
  formData: FormData
): Promise<AdminBookingActionState> {
  await requireAdmin();

  const parsed = parseAdminBookingForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const { checkIn, checkOut, ...rest } = parsed.data;

  try {
    await createAdminBooking({
      ...rest,
      checkIn: new Date(`${checkIn}T00:00:00.000Z`),
      checkOut: new Date(`${checkOut}T00:00:00.000Z`),
    });
    revalidatePath("/admin/rezervasyonlar");
    revalidatePath("/admin/musteri-yonetimi");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Rezervasyon oluşturulamadı",
    };
  }
}

export async function updateAdminBookingAction(
  _prevState: AdminBookingActionState,
  formData: FormData
): Promise<AdminBookingActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Rezervasyon kimliği eksik" };

  const parsed = parseAdminBookingForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const { checkIn, checkOut, ...rest } = parsed.data;

  try {
    await updateAdminBooking(id, {
      ...rest,
      checkIn: new Date(`${checkIn}T00:00:00.000Z`),
      checkOut: new Date(`${checkOut}T00:00:00.000Z`),
    });
    revalidatePath("/admin/rezervasyonlar");
    revalidatePath("/admin/musteri-yonetimi");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Rezervasyon güncellenemedi",
    };
  }
}

export async function changeBookingStatus(id: string, status: BookingStatus) {
  await requireAdmin();
  await updateBookingStatus(id, status);
  revalidatePath("/admin/rezervasyonlar");
}

const stayStatusSchema = z.enum([
  StayStatus.BEKLENIYOR,
  StayStatus.YAPILDI,
  StayStatus.YAPILMADI,
]);

const bookingDetailSchema = z.object({
  id: z.string().min(1),
  status: bookingStatusSchema,
  stayStatus: stayStatusSchema,
  checkIn: z.string().min(1, "Giriş tarihi gerekli"),
  checkOut: z.string().min(1, "Çıkış tarihi gerekli"),
  adults: z.coerce.number().min(1),
  children: z.coerce.number().min(0),
  babies: z.coerce.number().min(0),
  guestName: z.string().min(2),
  guestEmail: z.string().min(3),
  guestPhone: z.string().min(1),
  totalPrice: z.number().nullable(),
  details: z.record(z.string(), z.unknown()),
});

export async function getBookingDetailAction(id: string) {
  await requireAdmin();
  return getAdminBookingDetail(id);
}

export async function getBookingPrepaymentRateAction(
  villaId: string,
  checkIn: string
) {
  await requireAdmin();
  if (!villaId || !checkIn) return 20;
  return resolveBookingPrepaymentRate(
    villaId,
    new Date(`${checkIn}T00:00:00.000Z`)
  );
}

export async function getBookingPeriodFeesAction(
  villaId: string,
  checkIn: string
) {
  await requireAdmin();
  if (!villaId || !checkIn) {
    return {
      extraAccommodationFee: null,
      cleaningFee: null,
      petCleaningFee: null,
      poolHeatingPrivateFee: null,
      poolHeatingIndoorFee: null,
      underfloorHeatingFee: null,
    };
  }
  return resolveBookingPeriodFees(
    villaId,
    new Date(`${checkIn}T00:00:00.000Z`)
  );
}

export async function updateBookingDetailAction(
  payload: z.infer<typeof bookingDetailSchema>
): Promise<AdminBookingActionState> {
  await requireAdmin();

  const parsed = bookingDetailSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  try {
    await updateBookingDetail({
      id: parsed.data.id,
      status: parsed.data.status,
      stayStatus: parsed.data.stayStatus,
      checkIn: new Date(`${parsed.data.checkIn}T00:00:00.000Z`),
      checkOut: new Date(`${parsed.data.checkOut}T00:00:00.000Z`),
      adults: parsed.data.adults,
      children: parsed.data.children,
      babies: parsed.data.babies,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      guestPhone: parsed.data.guestPhone,
      totalPrice: parsed.data.totalPrice,
      details: parsed.data.details as BookingDetails,
    });
    revalidatePath("/admin/rezervasyonlar");
    revalidatePath("/admin/musteri-yonetimi");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Rezervasyon güncellenemedi",
    };
  }
}
