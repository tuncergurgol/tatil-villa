"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createBooking } from "@/lib/queries/bookings";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";
import { normalizeStoredTurkishPhone } from "@/lib/phone-utils";
import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";
import {
  DEFAULT_BOOKING_AGENCY_NAME,
  normalizeBookingSiteInfo,
} from "@/lib/booking-form-details";
import {
  buildActivityLogEntry,
  withInitialActivityLog,
} from "@/lib/booking-activity-log";
import { mapPublicPaymentMethodToCompanyType } from "@/lib/company-payment-types";
import { notifyNewReservationRequest } from "@/lib/public-booking-notifications";
import { getRequestClientIp } from "@/lib/request-client-ip";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { resolveVillaStayQuote } from "@/lib/queries/villa-stay-quote";
import {
  buildStayBookingFeeDetails,
  type PoolHeatingSelections,
  type StayFeeSelections,
} from "@/lib/stay-period-fees";

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
  feeSelections: z.string().optional(),
  poolHeatingSelections: z.string().optional(),
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

function parseBooleanRecord<T extends Record<string, boolean>>(
  raw: string | undefined
): T {
  if (!raw?.trim()) return {} as T;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {} as T;
    }
    return Object.fromEntries(
      Object.entries(value).filter(([, selected]) => selected === true)
    ) as T;
  } catch {
    return {} as T;
  }
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
    feeSelections: formData.get("feeSelections")?.toString() || undefined,
    poolHeatingSelections:
      formData.get("poolHeatingSelections")?.toString() || undefined,
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
    feeSelections: feeSelectionsRaw,
    poolHeatingSelections: poolHeatingSelectionsRaw,
    acceptMarketing,
    villaId,
    adults,
    children,
    babies,
    pets,
  } = parsed.data;

  const feeFieldKeys: BookingExtraFeeFieldKey[] = [
    "extraAccommodationFee",
    "cleaningFee",
    "petCleaningFee",
    "poolHeatingPrivateFee",
    "poolHeatingIndoorFee",
    "poolHeatingKidsFee",
    "underfloorHeatingFee",
  ];

  const selections = parseBooleanRecord<StayFeeSelections>(feeSelectionsRaw);
  const poolSelections = parseBooleanRecord<PoolHeatingSelections>(
    poolHeatingSelectionsRaw
  );

  let verifiedPricing;
  try {
    verifiedPricing = await resolveVillaStayQuote(
      villaId,
      checkIn,
      checkOut
    );
  } catch {
    return { error: "Güncel fiyat ve döviz kuru doğrulanamadı." };
  }
  if (!verifiedPricing?.quote.valid) {
    return {
      error:
        verifiedPricing?.quote.invalidReason ??
        "Seçilen tarihler için fiyat hesaplanamadı.",
    };
  }

  const feeFields = buildStayBookingFeeDetails({
    fees: verifiedPricing.periodFees,
    selections,
    pets,
    nights: verifiedPricing.quote.nights,
    adults,
    children,
    baseCapacity: verifiedPricing.baseCapacity,
    cleaningFee: verifiedPricing.quote.cleaningFee,
    heatedPools: verifiedPricing.heatedPools,
    poolHeatingSelections: poolSelections,
    checkIn,
    checkOut,
  });
  const verifiedExtraTotal = feeFieldKeys.reduce(
    (sum, key) => sum + (feeFields[key] ?? 0),
    0
  );
  const accommodationTotal = verifiedPricing.quote.accommodationTotal;
  const verifiedTotal = accommodationTotal + verifiedExtraTotal;
  const verifiedPrepayment = verifiedPricing.quote.prepaymentAmount;
  const resolvedCheckIn = Math.max(0, verifiedTotal - verifiedPrepayment);

  const companyPaymentType = mapPublicPaymentMethodToCompanyType(paymentMethod);
  const clientIp = await getRequestClientIp();
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const siteInfo = normalizeBookingSiteInfo(site.brandName);
  const originDomain = site.domain?.trim() || company.domain?.trim() || "";

  let booking;
  try {
    booking = await createBooking({
      villaId,
      adults,
      children,
      babies,
      pets,
      checkIn: dateKeyToDbDate(checkIn),
      checkOut: dateKeyToDbDate(checkOut),
      guestName,
      guestEmail,
      guestPhone,
      totalPrice: verifiedTotal,
      details: withInitialActivityLog(
        {
          paymentMethod,
          paymentAmount,
          importPaymentMethod: companyPaymentType || undefined,
          prepaymentBank: companyPaymentType || undefined,
          siteInfo,
          originDomain,
          agencyName:
            company.agencyName?.trim() || DEFAULT_BOOKING_AGENCY_NAME,
          grossPrice: accommodationTotal,
          ...feeFields,
          damageDeposit: verifiedPricing.periodFees.damageDeposit,
          petDamageDeposit:
            pets > 0
              ? verifiedPricing.periodFees.petDamageDeposit
              : null,
          prepaymentAmount: verifiedPrepayment,
          prepaymentRate: verifiedPricing.quote.prepaymentRate,
          checkInPayment: resolvedCheckIn,
          feesFromQuote: true,
          exchangeRateVerified: true,
          exchangeRateSource: verifiedPricing.exchangeRates.source,
          exchangeRatePublishedAt:
            verifiedPricing.exchangeRates.publishedAt,
          exchangeRates: {
            EUR: verifiedPricing.exchangeRates.EUR,
            USD: verifiedPricing.exchangeRates.USD,
            GBP: verifiedPricing.exchangeRates.GBP,
          },
          acceptMarketing: acceptMarketing ?? false,
          source: "public_pre_reservation",
        },
        buildActivityLogEntry({
          action: "booking_created",
          message: `Web üzerinden rezervasyon talebi oluşturuldu (${guestName})`,
          actorName: guestName || "Misafir",
          meta: clientIp
            ? { ip: clientIp, site: siteInfo, domain: originDomain }
            : { site: siteInfo, domain: originDomain },
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
