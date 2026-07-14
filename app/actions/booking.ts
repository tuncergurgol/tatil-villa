"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createBooking } from "@/lib/queries/bookings";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";
import { normalizeStoredTurkishPhone } from "@/lib/phone-utils";
import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";
import {
  DEFAULT_BOOKING_AGENCY_NAME,
  DEFAULT_BOOKING_SITE_INFO,
} from "@/lib/booking-form-details";
import {
  buildActivityLogEntry,
  withInitialActivityLog,
} from "@/lib/booking-activity-log";
import { mapPublicPaymentMethodToCompanyType } from "@/lib/company-payment-types";
import { notifyNewReservationRequest } from "@/lib/public-booking-notifications";
import { getRequestClientIp } from "@/lib/request-client-ip";

const optionalMoney = z.coerce.number().optional().nullable();

const priceDetailsSchema = z
  .object({
    extraAccommodationFee: optionalMoney,
    cleaningFee: optionalMoney,
    petCleaningFee: optionalMoney,
    poolHeatingPrivateFee: optionalMoney,
    poolHeatingIndoorFee: optionalMoney,
    poolHeatingKidsFee: optionalMoney,
    underfloorHeatingFee: optionalMoney,
    damageDeposit: optionalMoney,
    petDamageDeposit: optionalMoney,
  })
  .partial();

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
  grossPrice: z.coerce.number().optional(),
  prepaymentAmount: z.coerce.number().optional(),
  prepaymentRate: z.coerce.number().optional(),
  checkInPayment: z.coerce.number().optional(),
  priceDetails: z.string().optional(),
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

function parsePriceDetails(raw: string | undefined) {
  if (!raw?.trim()) return {};
  try {
    const parsed = priceDetailsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

function moneyOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

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
    grossPrice: formData.get("grossPrice") || undefined,
    prepaymentAmount: formData.get("prepaymentAmount") || undefined,
    prepaymentRate: formData.get("prepaymentRate") || undefined,
    checkInPayment: formData.get("checkInPayment") || undefined,
    priceDetails: formData.get("priceDetails")?.toString() || undefined,
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
    grossPrice,
    prepaymentAmount,
    prepaymentRate,
    checkInPayment,
    priceDetails: priceDetailsRaw,
    acceptMarketing,
    ...rest
  } = parsed.data;

  const feeLines = parsePriceDetails(priceDetailsRaw);
  const accommodationTotal = moneyOrNull(grossPrice);
  const resolvedCheckIn =
    moneyOrNull(checkInPayment) ??
    (totalPrice != null && prepaymentAmount != null
      ? Math.max(0, totalPrice - prepaymentAmount)
      : null);

  const feeFieldKeys: BookingExtraFeeFieldKey[] = [
    "extraAccommodationFee",
    "cleaningFee",
    "petCleaningFee",
    "poolHeatingPrivateFee",
    "poolHeatingIndoorFee",
    "poolHeatingKidsFee",
    "underfloorHeatingFee",
  ];

  const feeFields = Object.fromEntries(
    feeFieldKeys.map((key) => [key, moneyOrNull(feeLines[key])])
  ) as Record<BookingExtraFeeFieldKey, number | null>;

  const companyPaymentType = mapPublicPaymentMethodToCompanyType(paymentMethod);
  const clientIp = await getRequestClientIp();

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
      details: withInitialActivityLog(
        {
          paymentMethod,
          paymentAmount,
          importPaymentMethod: companyPaymentType || undefined,
          prepaymentBank: companyPaymentType || undefined,
          siteInfo: DEFAULT_BOOKING_SITE_INFO,
          agencyName: DEFAULT_BOOKING_AGENCY_NAME,
          grossPrice: accommodationTotal,
          ...feeFields,
          damageDeposit: moneyOrNull(feeLines.damageDeposit),
          petDamageDeposit: moneyOrNull(feeLines.petDamageDeposit),
          prepaymentAmount: moneyOrNull(prepaymentAmount),
          prepaymentRate: prepaymentRate ?? null,
          checkInPayment: resolvedCheckIn,
          feesFromQuote: true,
          acceptMarketing: acceptMarketing ?? false,
          source: "public_pre_reservation",
        },
        buildActivityLogEntry({
          action: "booking_created",
          message: `Web üzerinden rezervasyon talebi oluşturuldu (${guestName})`,
          actorName: guestName || "Misafir",
          meta: clientIp ? { ip: clientIp } : undefined,
        })
      ),
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Rezervasyon oluşturulamadı",
    };
  }

  await notifyNewReservationRequest(booking);

  redirect(`/rezervasyon/basarili?id=${booking.id}`);
}
