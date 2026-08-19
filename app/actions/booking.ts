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
import { validateCouponForBooking } from "@/lib/coupon-service";
import { getCurrentMember } from "@/lib/member-session.server";
import { linkMemberToCustomer } from "@/lib/member-account";
import { resolveMemberContactProfile } from "@/lib/member-profile";
import {
  applyMemberDiscountAfterBooking,
  validateMemberDiscountSubmission,
} from "@/lib/member-discount-apply";
import { prisma } from "@/lib/db";
import { hasVillaTourismDocument } from "@/lib/villa-document-types";
import {
  buildStayBookingFeeDetails,
  type PoolHeatingSelections,
  type StayFeeSelections,
} from "@/lib/stay-period-fees";
import { resolveVillaPaymentAmountOptions } from "@/lib/villa-payment-amount-options";

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
    .refine((value) => /^\+[1-9]\d{7,14}$/.test(value), "Geçerli telefon girin"),
  paymentMethod: z.enum(["card", "transfer"]).default("transfer"),
  paymentAmount: z.enum(["prepayment", "full"]).default("prepayment"),
  feeSelections: z.string().optional(),
  poolHeatingSelections: z.string().optional(),
  acceptMarketing: z
    .enum(["true", "false", "on", "off", ""])
    .optional()
    .transform((value) => value === "true" || value === "on"),
  couponCode: z.string().trim().optional(),
  couponDiscountAmount: z.coerce.number().min(0).optional(),
  loyaltyVoucherId: z.string().trim().optional(),
  couponBalanceAmount: z.coerce.number().min(0).optional(),
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
    couponCode: formData.get("couponCode")?.toString() || "",
    couponDiscountAmount: formData.get("couponDiscountAmount") ?? "",
    loyaltyVoucherId: formData.get("loyaltyVoucherId")?.toString() || "",
    couponBalanceAmount: formData.get("couponBalanceAmount") ?? "",
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
    couponCode,
    couponDiscountAmount: couponDiscountAmountRaw,
    loyaltyVoucherId,
    couponBalanceAmount: couponBalanceAmountRaw,
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

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      active: true,
      documentNo: true,
      documentType: true,
    },
  });
  if (!villa?.active) {
    return { error: "Villa bulunamadı" };
  }
  if (!hasVillaTourismDocument(villa)) {
    return {
      error: "Bu villa için online rezervasyon alınmamaktadır.",
    };
  }

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

  const allowedPaymentAmounts = resolveVillaPaymentAmountOptions({
    allowPrepaymentOption: verifiedPricing.allowPrepaymentOption,
    allowFullPaymentOption: verifiedPricing.allowFullPaymentOption,
  });
  if (!allowedPaymentAmounts.includes(paymentAmount)) {
    return { error: "Bu villa için seçilen ödeme tutarı geçerli değil." };
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
  const companyPaymentType = mapPublicPaymentMethodToCompanyType(paymentMethod);
  const clientIp = await getRequestClientIp();
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  let agencyDiscountAmount = 0;
  let appliedCouponCode: string | null = null;
  let appliedLoyaltyVoucherId: string | null = null;
  let appliedCouponBalance = 0;
  const member = await getCurrentMember();
  const requestedDiscount = couponDiscountAmountRaw ?? 0;

  if (member && requestedDiscount > 0) {
    const discountResult = await validateMemberDiscountSubmission(
      member.id,
      accommodationTotal,
      site.key,
      {
        requestedAmount: requestedDiscount,
        couponCode: couponCode?.trim() || undefined,
        loyaltyVoucherId: loyaltyVoucherId?.trim() || undefined,
        couponBalanceAmount: couponBalanceAmountRaw ?? undefined,
      }
    );
    if (!discountResult.ok) return { error: discountResult.error };
    agencyDiscountAmount = discountResult.discount.amount;
    appliedCouponCode = discountResult.discount.couponCode ?? null;
    appliedLoyaltyVoucherId = discountResult.discount.loyaltyVoucherId ?? null;
    appliedCouponBalance = discountResult.discount.couponBalanceAmount ?? 0;
  } else if (couponCode?.trim()) {
    const couponResult = await validateCouponForBooking(
      async (code) =>
        prisma.coupon.findFirst({
          where: { code: { equals: code, mode: "insensitive" } },
        }),
      {
        code: couponCode,
        accommodationTotal,
        siteKey: site.key,
        memberId: member?.id ?? null,
      }
    );
    if (!couponResult.ok) return { error: couponResult.error };
    if (
      couponDiscountAmountRaw != null &&
      couponDiscountAmountRaw > 0 &&
      couponDiscountAmountRaw !== couponResult.discountAmount
    ) {
      return { error: "Kupon tutarı güncellendi, lütfen tekrar deneyin" };
    }
    agencyDiscountAmount = couponResult.discountAmount;
    appliedCouponCode = couponResult.coupon.code;
  }

  const verifiedTotal = accommodationTotal + verifiedExtraTotal;
  const verifiedPrepayment = Math.max(
    0,
    verifiedPricing.quote.prepaymentAmount - agencyDiscountAmount
  );
  const resolvedCheckIn = Math.max(0, verifiedTotal - verifiedPrepayment);

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
          agencyDiscountAmount,
          couponCode: appliedCouponCode,
          couponDiscountAmount: agencyDiscountAmount,
          loyaltyVoucherId: appliedLoyaltyVoucherId,
          couponBalanceAmount: appliedCouponBalance > 0 ? appliedCouponBalance : undefined,
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

  if (member) {
    const profile = await resolveMemberContactProfile(member.id);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        memberId: member.id,
        customerId: profile?.customerId ?? member.customerId ?? undefined,
        guestName: profile?.fullName || guestName,
        guestEmail: profile?.email || guestEmail,
        guestPhone: profile?.phone || guestPhone,
      },
    });
    await linkMemberToCustomer(member.id);
  }

  if (member && agencyDiscountAmount > 0) {
    await applyMemberDiscountAfterBooking(member.id, booking.id, {
      amount: agencyDiscountAmount,
      couponCode: appliedCouponCode ?? undefined,
      loyaltyVoucherId: appliedLoyaltyVoucherId ?? undefined,
      couponBalanceAmount: appliedCouponBalance > 0 ? appliedCouponBalance : undefined,
    });
  } else if (appliedCouponCode && agencyDiscountAmount > 0) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: { equals: appliedCouponCode, mode: "insensitive" } },
    });
    if (coupon) {
      await prisma.$transaction([
        prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        }),
        prisma.couponRedemption.create({
          data: {
            couponId: coupon.id,
            memberId: member?.id,
            bookingId: booking.id,
            discountAmount: agencyDiscountAmount,
          },
        }),
      ]);
    }
  }

  await notifyNewReservationRequest(booking);

  redirect(`/rezervasyon/basarili?id=${booking.id}`);
}
