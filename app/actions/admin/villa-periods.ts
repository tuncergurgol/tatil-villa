"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import { revalidateVillaHizliFiyatPage } from "@/lib/villa-admin-path.server";
import {
  compareDates,
  dateKeyToDbDate,
  dbDateToDateKey,
  parseDateKey,
} from "@/lib/villa-period-calendar";
import { applyVillaPeriodDaysOccupancy } from "@/lib/villa-occupancy-service";
import {
  CONFIRMED_BOOKING_OCCUPANCY_LOCKED_CODE,
  ConfirmedBookingOccupancyLockedError,
} from "@/lib/villa-confirmed-booking-guard";
import {
  syncVillaPricePeriodDays,
} from "@/lib/villa-period-day-sync";
import {
  applyVillaPriceRangeDiscountEdit,
  applyVillaPriceRangeEdit,
  applyVillaPriceRangeMergedEdit,
} from "@/lib/villa-period-split";
import type { VillaPeriodDayPricingSnapshot } from "@/lib/villa-period-days";
import {
  parseAvailability,
  parseCurrency,
  parseOptionalPositiveInt,
  resolveVillaPeriodPricing,
} from "@/lib/villa-period-pricing";

export type VillaPeriodActionState = {
  success?: boolean;
  error?: string;
  code?: string;
  removedPeriodIds?: string[];
};

export type VillaPeriodExcelImportRow = {
  startDate: string;
  endDate: string;
  nightlyPrice: number;
  nightlyPriceCurrency?: "TL" | "EUR" | "USD" | "GBP";
  prepaymentRate?: number | null;
  commissionRate?: number | null;
  minStayNights?: number | null;
  cleaningDayCount?: number | null;
  cleaningFee?: number | null;
  damageDeposit?: number | null;
  weekendPrice?: number | null;
  weekendDays?: number[];
  weekendMinStayNights?: number | null;
};

export type VillaPeriodExcelImportResult = VillaPeriodActionState & {
  importedCount?: number;
};

const optionalRateSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.min(100, Math.round(parsed));
  });

const optionalPositiveIntSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => parseOptionalPositiveInt(value));

const weekendDaysSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return [] as number[];
    return String(value)
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  });

const periodSchema = z.object({
  startDate: z.string().min(1, "Başlangıç tarihi gerekli"),
  endDate: z.string().min(1, "Bitiş tarihi gerekli"),
  availability: z.enum(["available", "closed"]),
  nightlyPrice: z.coerce.number().int().positive("Gecelik fiyat pozitif olmalı"),
  nightlyPriceCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  weeklyPrice: optionalPositiveIntSchema,
  prepaymentRate: optionalRateSchema,
  commissionRate: optionalRateSchema,
  nightlyPriceWithoutCommission: optionalPositiveIntSchema,
  minStayNights: optionalPositiveIntSchema,
  cleaningDayCount: optionalPositiveIntSchema,
  cleaningFee: optionalPositiveIntSchema,
  cleaningFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  damageDeposit: optionalPositiveIntSchema,
  damageDepositCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  petCleaningFee: optionalPositiveIntSchema,
  petCleaningFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  petDamageDeposit: optionalPositiveIntSchema,
  petDamageDepositCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  underfloorHeatingFee: optionalPositiveIntSchema,
  underfloorHeatingFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  extraBedFee: optionalPositiveIntSchema,
  extraBedFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  poolHeatingPrivateFee: optionalPositiveIntSchema,
  poolHeatingPrivateFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  poolHeatingIndoorFee: optionalPositiveIntSchema,
  poolHeatingIndoorFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  poolHeatingKidsFee: optionalPositiveIntSchema,
  poolHeatingKidsFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  discount1Rate: optionalRateSchema,
  discount2Rate: optionalRateSchema,
  extraDiscountAmount: optionalPositiveIntSchema,
  weekendPrice: optionalPositiveIntSchema,
  weekendDays: weekendDaysSchema,
  weekendMinStayNights: optionalPositiveIntSchema,
  childFee02: optionalPositiveIntSchema,
  childFee02Currency: z.enum(["TL", "EUR", "USD", "GBP"]),
  childFee03_09: optionalPositiveIntSchema,
  childFee03_09Currency: z.enum(["TL", "EUR", "USD", "GBP"]),
});

const periodPricingFieldsSchema = periodSchema.omit({
  discount1Rate: true,
  discount2Rate: true,
  extraDiscountAmount: true,
});

const periodDiscountFieldsSchema = z.object({
  startDate: z.string().min(1, "Başlangıç tarihi gerekli"),
  endDate: z.string().min(1, "Bitiş tarihi gerekli"),
  discount1Rate: optionalRateSchema,
  discount2Rate: optionalRateSchema,
  extraDiscountAmount: optionalPositiveIntSchema,
});

const PERIOD_FIELD_LABELS: Record<string, string> = {
  startDate: "Başlangıç tarihi",
  endDate: "Bitiş tarihi",
  nightlyPrice: "Gecelik konaklama bedeli",
  weeklyPrice: "Haftalık konaklama bedeli",
  prepaymentRate: "Ön ödeme oranı",
  commissionRate: "Komisyon oranı",
  discount1Rate: "İndirim 1 oranı",
  discount2Rate: "İndirim 2 oranı",
  weekendDays: "Hafta sonu günleri",
};

function formatPeriodFormError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Geçersiz form verisi";

  const field = issue.path[0];
  const label =
    typeof field === "string"
      ? (PERIOD_FIELD_LABELS[field] ?? field)
      : "Form alanı";

  if (issue.message && issue.message !== "Invalid input") {
    return issue.message;
  }

  return `${label} geçersiz`;
}

async function revalidatePeriodPaths(villaId: string) {
  revalidatePath("/admin/konaklama/takvim");
  await revalidateVillaTakvimPath(villaId);
  await revalidateVillaHizliFiyatPage(villaId);
}

async function revalidateVillaTakvimPath(villaId: string) {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, villaId: true },
  });
  if (villa) {
    revalidatePath(villaTakvimPath(villa));
  }
}

async function findOverlappingPeriods(
  villaId: string,
  rangeStart: Date,
  rangeEnd: Date
) {
  return prisma.villaPricePeriod.findMany({
    where: {
      villaId,
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    orderBy: { startDate: "asc" },
  });
}

function parsePeriodDates(startRaw: string, endRaw: string) {
  if (compareDates(parseDateKey(startRaw), parseDateKey(endRaw)) > 0) {
    throw new Error("Bitiş tarihi başlangıçtan önce olamaz");
  }

  return {
    startDate: dateKeyToDbDate(startRaw),
    endDate: dateKeyToDbDate(endRaw),
  };
}

function parsePeriodFormData(formData: FormData) {
  return periodSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    availability: parseAvailability(formData.get("availability")),
    nightlyPrice: formData.get("nightlyPrice"),
    nightlyPriceCurrency: parseCurrency(formData.get("nightlyPriceCurrency")),
    weeklyPrice: formData.get("weeklyPrice") || null,
    prepaymentRate: formData.get("prepaymentRate"),
    commissionRate: formData.get("commissionRate"),
    nightlyPriceWithoutCommission:
      formData.get("nightlyPriceWithoutCommission") || null,
    minStayNights: formData.get("minStayNights") || null,
    cleaningDayCount: formData.get("cleaningDayCount") || null,
    cleaningFee: formData.get("cleaningFee") || null,
    cleaningFeeCurrency: parseCurrency(formData.get("cleaningFeeCurrency")),
    damageDeposit: formData.get("damageDeposit") || null,
    damageDepositCurrency: parseCurrency(formData.get("damageDepositCurrency")),
    petCleaningFee: formData.get("petCleaningFee") || null,
    petCleaningFeeCurrency: parseCurrency(
      formData.get("petCleaningFeeCurrency")
    ),
    petDamageDeposit: formData.get("petDamageDeposit") || null,
    petDamageDepositCurrency: parseCurrency(
      formData.get("petDamageDepositCurrency")
    ),
    underfloorHeatingFee: formData.get("underfloorHeatingFee") || null,
    underfloorHeatingFeeCurrency: parseCurrency(
      formData.get("underfloorHeatingFeeCurrency")
    ),
    extraBedFee: formData.get("extraBedFee") || null,
    extraBedFeeCurrency: parseCurrency(formData.get("extraBedFeeCurrency")),
    poolHeatingPrivateFee: formData.get("poolHeatingPrivateFee") || null,
    poolHeatingPrivateFeeCurrency: parseCurrency(
      formData.get("poolHeatingPrivateFeeCurrency")
    ),
    poolHeatingIndoorFee: formData.get("poolHeatingIndoorFee") || null,
    poolHeatingIndoorFeeCurrency: parseCurrency(
      formData.get("poolHeatingIndoorFeeCurrency")
    ),
    poolHeatingKidsFee: formData.get("poolHeatingKidsFee") || null,
    poolHeatingKidsFeeCurrency: parseCurrency(
      formData.get("poolHeatingKidsFeeCurrency")
    ),
    discount1Rate: formData.get("discount1Rate"),
    discount2Rate: formData.get("discount2Rate"),
    extraDiscountAmount: formData.get("extraDiscountAmount") || null,
    weekendPrice: formData.get("weekendPrice") || null,
    weekendDays: formData.get("weekendDays") || "",
    weekendMinStayNights: formData.get("weekendMinStayNights") || null,
    childFee02: formData.get("childFee02") || null,
    childFee02Currency: parseCurrency(formData.get("childFee02Currency")),
    childFee03_09: formData.get("childFee03_09") || null,
    childFee03_09Currency: parseCurrency(formData.get("childFee03_09Currency")),
  });
}

function parsePeriodPricingFormData(formData: FormData) {
  return periodPricingFieldsSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    availability: parseAvailability(formData.get("availability")),
    nightlyPrice: formData.get("nightlyPrice"),
    nightlyPriceCurrency: parseCurrency(formData.get("nightlyPriceCurrency")),
    weeklyPrice: formData.get("weeklyPrice") || null,
    prepaymentRate: formData.get("prepaymentRate"),
    commissionRate: formData.get("commissionRate"),
    nightlyPriceWithoutCommission:
      formData.get("nightlyPriceWithoutCommission") || null,
    minStayNights: formData.get("minStayNights") || null,
    cleaningDayCount: formData.get("cleaningDayCount") || null,
    cleaningFee: formData.get("cleaningFee") || null,
    cleaningFeeCurrency: parseCurrency(formData.get("cleaningFeeCurrency")),
    damageDeposit: formData.get("damageDeposit") || null,
    damageDepositCurrency: parseCurrency(formData.get("damageDepositCurrency")),
    petCleaningFee: formData.get("petCleaningFee") || null,
    petCleaningFeeCurrency: parseCurrency(
      formData.get("petCleaningFeeCurrency")
    ),
    petDamageDeposit: formData.get("petDamageDeposit") || null,
    petDamageDepositCurrency: parseCurrency(
      formData.get("petDamageDepositCurrency")
    ),
    underfloorHeatingFee: formData.get("underfloorHeatingFee") || null,
    underfloorHeatingFeeCurrency: parseCurrency(
      formData.get("underfloorHeatingFeeCurrency")
    ),
    extraBedFee: formData.get("extraBedFee") || null,
    extraBedFeeCurrency: parseCurrency(formData.get("extraBedFeeCurrency")),
    poolHeatingPrivateFee: formData.get("poolHeatingPrivateFee") || null,
    poolHeatingPrivateFeeCurrency: parseCurrency(
      formData.get("poolHeatingPrivateFeeCurrency")
    ),
    poolHeatingIndoorFee: formData.get("poolHeatingIndoorFee") || null,
    poolHeatingIndoorFeeCurrency: parseCurrency(
      formData.get("poolHeatingIndoorFeeCurrency")
    ),
    poolHeatingKidsFee: formData.get("poolHeatingKidsFee") || null,
    poolHeatingKidsFeeCurrency: parseCurrency(
      formData.get("poolHeatingKidsFeeCurrency")
    ),
    weekendPrice: formData.get("weekendPrice") || null,
    weekendDays: formData.get("weekendDays") || "",
    weekendMinStayNights: formData.get("weekendMinStayNights") || null,
    childFee02: formData.get("childFee02") || null,
    childFee02Currency: parseCurrency(formData.get("childFee02Currency")),
    childFee03_09: formData.get("childFee03_09") || null,
    childFee03_09Currency: parseCurrency(formData.get("childFee03_09Currency")),
  });
}

function parsePeriodDiscountFormData(formData: FormData) {
  return periodDiscountFieldsSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    discount1Rate: formData.get("discount1Rate"),
    discount2Rate: formData.get("discount2Rate"),
    extraDiscountAmount: formData.get("extraDiscountAmount") || null,
  });
}

function buildPeriodData(parsed: z.infer<typeof periodSchema>) {
  const pricing = resolveVillaPeriodPricing({
    nightlyPrice: parsed.nightlyPrice,
    nightlyPriceWithoutCommission: parsed.nightlyPriceWithoutCommission,
    weeklyPrice: parsed.weeklyPrice,
    commissionRate: parsed.commissionRate,
    discount1Rate: parsed.discount1Rate,
    discount2Rate: parsed.discount2Rate,
    extraDiscountAmount: parsed.extraDiscountAmount,
  });

  return {
    availability: parsed.availability,
    nightlyPrice: pricing.nightlyPrice,
    nightlyPriceCurrency: parsed.nightlyPriceCurrency,
    weeklyPrice: pricing.weeklyPrice,
    prepaymentRate: parsed.prepaymentRate,
    commissionRate: parsed.commissionRate,
    nightlyPriceWithoutCommission: pricing.nightlyPriceWithoutCommission,
    discountedNightlyPrice: pricing.discountedNightlyPrice,
    minStayNights: parsed.minStayNights,
    cleaningDayCount: parsed.cleaningDayCount,
    cleaningFee: parsed.cleaningFee,
    cleaningFeeCurrency: parsed.cleaningFeeCurrency,
    damageDeposit: parsed.damageDeposit,
    damageDepositCurrency: parsed.damageDepositCurrency,
    petCleaningFee: parsed.petCleaningFee,
    petCleaningFeeCurrency: parsed.petCleaningFeeCurrency,
    petDamageDeposit: parsed.petDamageDeposit,
    petDamageDepositCurrency: parsed.petDamageDepositCurrency,
    underfloorHeatingFee: parsed.underfloorHeatingFee,
    underfloorHeatingFeeCurrency: parsed.underfloorHeatingFeeCurrency,
    extraBedFee: parsed.extraBedFee,
    extraBedFeeCurrency: parsed.extraBedFeeCurrency,
    poolHeatingPrivateFee: parsed.poolHeatingPrivateFee,
    poolHeatingPrivateFeeCurrency: parsed.poolHeatingPrivateFeeCurrency,
    poolHeatingIndoorFee: parsed.poolHeatingIndoorFee,
    poolHeatingIndoorFeeCurrency: parsed.poolHeatingIndoorFeeCurrency,
    poolHeatingKidsFee: parsed.poolHeatingKidsFee,
    poolHeatingKidsFeeCurrency: parsed.poolHeatingKidsFeeCurrency,
    discount1Rate: parsed.discount1Rate,
    discount2Rate: parsed.discount2Rate,
    extraDiscountAmount: parsed.extraDiscountAmount,
    weekendPrice: parsed.weekendPrice,
    weekendDays: parsed.weekendDays,
    weekendMinStayNights: parsed.weekendMinStayNights,
    childFee02: parsed.childFee02,
    childFee02Currency: parsed.childFee02Currency,
    childFee03_09: parsed.childFee03_09,
    childFee03_09Currency: parsed.childFee03_09Currency,
  };
}

function buildPricingOnlyPeriodData(
  parsed: z.infer<typeof periodPricingFieldsSchema>,
  existingDiscounts: {
    discount1Rate: number | null;
    discount2Rate: number | null;
    extraDiscountAmount: number | null;
  }
) {
  const pricing = resolveVillaPeriodPricing({
    nightlyPrice: parsed.nightlyPrice,
    nightlyPriceWithoutCommission: parsed.nightlyPriceWithoutCommission,
    weeklyPrice: parsed.weeklyPrice,
    commissionRate: parsed.commissionRate,
    discount1Rate: existingDiscounts.discount1Rate,
    discount2Rate: existingDiscounts.discount2Rate,
    extraDiscountAmount: existingDiscounts.extraDiscountAmount,
  });

  return {
    availability: parsed.availability,
    nightlyPrice: pricing.nightlyPrice,
    nightlyPriceCurrency: parsed.nightlyPriceCurrency,
    weeklyPrice: pricing.weeklyPrice,
    prepaymentRate: parsed.prepaymentRate,
    commissionRate: parsed.commissionRate,
    nightlyPriceWithoutCommission: pricing.nightlyPriceWithoutCommission,
    discountedNightlyPrice: pricing.discountedNightlyPrice,
    minStayNights: parsed.minStayNights,
    cleaningDayCount: parsed.cleaningDayCount,
    cleaningFee: parsed.cleaningFee,
    cleaningFeeCurrency: parsed.cleaningFeeCurrency,
    damageDeposit: parsed.damageDeposit,
    damageDepositCurrency: parsed.damageDepositCurrency,
    petCleaningFee: parsed.petCleaningFee,
    petCleaningFeeCurrency: parsed.petCleaningFeeCurrency,
    petDamageDeposit: parsed.petDamageDeposit,
    petDamageDepositCurrency: parsed.petDamageDepositCurrency,
    underfloorHeatingFee: parsed.underfloorHeatingFee,
    underfloorHeatingFeeCurrency: parsed.underfloorHeatingFeeCurrency,
    extraBedFee: parsed.extraBedFee,
    extraBedFeeCurrency: parsed.extraBedFeeCurrency,
    poolHeatingPrivateFee: parsed.poolHeatingPrivateFee,
    poolHeatingPrivateFeeCurrency: parsed.poolHeatingPrivateFeeCurrency,
    poolHeatingIndoorFee: parsed.poolHeatingIndoorFee,
    poolHeatingIndoorFeeCurrency: parsed.poolHeatingIndoorFeeCurrency,
    poolHeatingKidsFee: parsed.poolHeatingKidsFee,
    poolHeatingKidsFeeCurrency: parsed.poolHeatingKidsFeeCurrency,
    discount1Rate: existingDiscounts.discount1Rate,
    discount2Rate: existingDiscounts.discount2Rate,
    extraDiscountAmount: existingDiscounts.extraDiscountAmount,
    weekendPrice: parsed.weekendPrice,
    weekendDays: parsed.weekendDays,
    weekendMinStayNights: parsed.weekendMinStayNights,
    childFee02: parsed.childFee02,
    childFee02Currency: parsed.childFee02Currency,
    childFee03_09: parsed.childFee03_09,
    childFee03_09Currency: parsed.childFee03_09Currency,
  };
}

function buildDiscountOnlyPeriodData(
  parsed: z.infer<typeof periodDiscountFieldsSchema>,
  existingPeriod: {
    nightlyPrice: number;
    nightlyPriceWithoutCommission: number | null;
    weeklyPrice: number | null;
    commissionRate: number | null;
    availability: "available" | "closed";
    nightlyPriceCurrency: "TL" | "EUR" | "USD" | "GBP";
    prepaymentRate: number | null;
    minStayNights: number | null;
    cleaningDayCount: number | null;
    cleaningFee: number | null;
    cleaningFeeCurrency: "TL" | "EUR" | "USD" | "GBP";
    damageDeposit: number | null;
    damageDepositCurrency: "TL" | "EUR" | "USD" | "GBP";
    petCleaningFee: number | null;
    petCleaningFeeCurrency: "TL" | "EUR" | "USD" | "GBP";
    petDamageDeposit: number | null;
    petDamageDepositCurrency: "TL" | "EUR" | "USD" | "GBP";
    underfloorHeatingFee: number | null;
    underfloorHeatingFeeCurrency: "TL" | "EUR" | "USD" | "GBP";
    extraBedFee: number | null;
    extraBedFeeCurrency: "TL" | "EUR" | "USD" | "GBP";
    poolHeatingPrivateFee: number | null;
    poolHeatingPrivateFeeCurrency: "TL" | "EUR" | "USD" | "GBP";
    poolHeatingIndoorFee: number | null;
    poolHeatingIndoorFeeCurrency: "TL" | "EUR" | "USD" | "GBP";
    poolHeatingKidsFee: number | null;
    poolHeatingKidsFeeCurrency: "TL" | "EUR" | "USD" | "GBP";
    weekendPrice: number | null;
    weekendDays: number[];
    weekendMinStayNights: number | null;
    childFee02: number | null;
    childFee02Currency: "TL" | "EUR" | "USD" | "GBP";
    childFee03_09: number | null;
    childFee03_09Currency: "TL" | "EUR" | "USD" | "GBP";
  }
) {
  const pricing = resolveVillaPeriodPricing({
    nightlyPrice: existingPeriod.nightlyPrice,
    nightlyPriceWithoutCommission: existingPeriod.nightlyPriceWithoutCommission,
    weeklyPrice: existingPeriod.weeklyPrice,
    commissionRate: existingPeriod.commissionRate,
    discount1Rate: parsed.discount1Rate,
    discount2Rate: parsed.discount2Rate,
    extraDiscountAmount: parsed.extraDiscountAmount,
  });

  return {
    availability: existingPeriod.availability,
    nightlyPrice: existingPeriod.nightlyPrice,
    nightlyPriceCurrency: existingPeriod.nightlyPriceCurrency,
    weeklyPrice: existingPeriod.weeklyPrice,
    prepaymentRate: existingPeriod.prepaymentRate,
    commissionRate: existingPeriod.commissionRate,
    nightlyPriceWithoutCommission: existingPeriod.nightlyPriceWithoutCommission,
    discountedNightlyPrice: pricing.discountedNightlyPrice,
    minStayNights: existingPeriod.minStayNights,
    cleaningDayCount: existingPeriod.cleaningDayCount,
    cleaningFee: existingPeriod.cleaningFee,
    cleaningFeeCurrency: existingPeriod.cleaningFeeCurrency,
    damageDeposit: existingPeriod.damageDeposit,
    damageDepositCurrency: existingPeriod.damageDepositCurrency,
    petCleaningFee: existingPeriod.petCleaningFee,
    petCleaningFeeCurrency: existingPeriod.petCleaningFeeCurrency,
    petDamageDeposit: existingPeriod.petDamageDeposit,
    petDamageDepositCurrency: existingPeriod.petDamageDepositCurrency,
    underfloorHeatingFee: existingPeriod.underfloorHeatingFee,
    underfloorHeatingFeeCurrency: existingPeriod.underfloorHeatingFeeCurrency,
    extraBedFee: existingPeriod.extraBedFee,
    extraBedFeeCurrency: existingPeriod.extraBedFeeCurrency,
    poolHeatingPrivateFee: existingPeriod.poolHeatingPrivateFee,
    poolHeatingPrivateFeeCurrency: existingPeriod.poolHeatingPrivateFeeCurrency,
    poolHeatingIndoorFee: existingPeriod.poolHeatingIndoorFee,
    poolHeatingIndoorFeeCurrency: existingPeriod.poolHeatingIndoorFeeCurrency,
    poolHeatingKidsFee: existingPeriod.poolHeatingKidsFee,
    poolHeatingKidsFeeCurrency: existingPeriod.poolHeatingKidsFeeCurrency,
    discount1Rate: parsed.discount1Rate,
    discount2Rate: parsed.discount2Rate,
    extraDiscountAmount: parsed.extraDiscountAmount,
    weekendPrice: existingPeriod.weekendPrice,
    weekendDays: existingPeriod.weekendDays,
    weekendMinStayNights: existingPeriod.weekendMinStayNights,
    childFee02: existingPeriod.childFee02,
    childFee02Currency: existingPeriod.childFee02Currency,
    childFee03_09: existingPeriod.childFee03_09,
    childFee03_09Currency: existingPeriod.childFee03_09Currency,
  };
}

export async function createVillaPricePeriod(
  villaId: string,
  formData: FormData
): Promise<VillaPeriodActionState> {
  await requireAdmin();

  const parsed = parsePeriodFormData(formData);

  if (!parsed.success) {
    return { error: formatPeriodFormError(parsed.error) };
  }

  try {
    const { startDate, endDate } = parsePeriodDates(
      parsed.data.startDate,
      parsed.data.endDate
    );
    const periodData = buildPeriodData(parsed.data);
    const overlapping = await findOverlappingPeriods(villaId, startDate, endDate);

    if (overlapping.length > 0) {
      await applyVillaPriceRangeMergedEdit(
        villaId,
        startDate,
        endDate,
        periodData as VillaPeriodDayPricingSnapshot,
        overlapping
      );
    } else {
      const period = await prisma.villaPricePeriod.create({
        data: {
          villaId,
          startDate,
          endDate,
          ...periodData,
        },
      });

      await syncVillaPricePeriodDays(
        period.id,
        villaId,
        startDate,
        endDate,
        periodData as VillaPeriodDayPricingSnapshot
      );
    }

    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Periyot oluşturulamadı",
    };
  }
}

export async function importVillaPricePeriodsFromExcel(
  villaId: string,
  rows: VillaPeriodExcelImportRow[]
): Promise<VillaPeriodExcelImportResult> {
  await requireAdmin();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Excel dosyasında aktarılacak periyot bulunamadı" };
  }
  if (rows.length > 500) {
    return { error: "Tek seferde en fazla 500 periyot aktarabilirsiniz" };
  }

  const parsedRows: z.infer<typeof periodSchema>[] = [];
  for (const [index, row] of rows.entries()) {
    const currency = parseCurrency(row.nightlyPriceCurrency ?? "TL");
    const parsed = periodSchema.safeParse({
      startDate: row.startDate,
      endDate: row.endDate,
      availability: "available",
      nightlyPrice: row.nightlyPrice,
      nightlyPriceCurrency: currency,
      weeklyPrice: null,
      prepaymentRate: row.prepaymentRate ?? null,
      commissionRate: row.commissionRate ?? null,
      nightlyPriceWithoutCommission: null,
      minStayNights: row.minStayNights ?? null,
      cleaningDayCount: row.cleaningDayCount ?? null,
      cleaningFee: row.cleaningFee ?? null,
      cleaningFeeCurrency: currency,
      damageDeposit: row.damageDeposit ?? null,
      damageDepositCurrency: currency,
      petCleaningFee: null,
      petCleaningFeeCurrency: currency,
      petDamageDeposit: null,
      petDamageDepositCurrency: currency,
      underfloorHeatingFee: null,
      underfloorHeatingFeeCurrency: currency,
      extraBedFee: null,
      extraBedFeeCurrency: currency,
      poolHeatingPrivateFee: null,
      poolHeatingPrivateFeeCurrency: currency,
      poolHeatingIndoorFee: null,
      poolHeatingIndoorFeeCurrency: currency,
      poolHeatingKidsFee: null,
      poolHeatingKidsFeeCurrency: currency,
      discount1Rate: null,
      discount2Rate: null,
      extraDiscountAmount: null,
      weekendPrice: row.weekendPrice ?? null,
      weekendDays: (row.weekendDays ?? []).join(","),
      weekendMinStayNights: row.weekendMinStayNights ?? null,
      childFee02: null,
      childFee02Currency: currency,
      childFee03_09: null,
      childFee03_09Currency: currency,
    });

    if (!parsed.success) {
      return {
        error: `${index + 2}. satır: ${formatPeriodFormError(parsed.error)}`,
      };
    }

    try {
      parsePeriodDates(parsed.data.startDate, parsed.data.endDate);
    } catch (error) {
      return {
        error: `${index + 2}. satır: ${
          error instanceof Error ? error.message : "Tarih aralığı geçersiz"
        }`,
      };
    }
    parsedRows.push(parsed.data);
  }

  try {
    for (const parsed of parsedRows) {
      const { startDate, endDate } = parsePeriodDates(
        parsed.startDate,
        parsed.endDate
      );
      const periodData = buildPeriodData(parsed);
      const overlapping = await findOverlappingPeriods(
        villaId,
        startDate,
        endDate
      );

      if (overlapping.length > 0) {
        await applyVillaPriceRangeMergedEdit(
          villaId,
          startDate,
          endDate,
          periodData as VillaPeriodDayPricingSnapshot,
          overlapping
        );
      } else {
        const period = await prisma.villaPricePeriod.create({
          data: { villaId, startDate, endDate, ...periodData },
        });
        await syncVillaPricePeriodDays(
          period.id,
          villaId,
          startDate,
          endDate,
          periodData as VillaPeriodDayPricingSnapshot
        );
      }
    }

    await revalidatePeriodPaths(villaId);
    return { success: true, importedCount: parsedRows.length };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Excel periyotları içeri aktarılamadı",
    };
  }
}

export async function updateVillaPricePeriod(
  villaId: string,
  periodId: string,
  formData: FormData
): Promise<VillaPeriodActionState> {
  await requireAdmin();

  const parsed = parsePeriodFormData(formData);

  if (!parsed.success) {
    return { error: formatPeriodFormError(parsed.error) };
  }

  try {
    const { startDate, endDate } = parsePeriodDates(
      parsed.data.startDate,
      parsed.data.endDate
    );
    const periodData = buildPeriodData(parsed.data);
    const overlapping = await findOverlappingPeriods(villaId, startDate, endDate);
    const extraRemoveIds = overlapping.some((period) => period.id === periodId)
      ? []
      : [periodId];
    const selfPeriod = overlapping.find((period) => period.id === periodId);
    const datesUnchanged =
      selfPeriod != null &&
      dbDateToDateKey(selfPeriod.startDate) === dbDateToDateKey(startDate) &&
      dbDateToDateKey(selfPeriod.endDate) === dbDateToDateKey(endDate);

    if (overlapping.length === 0) {
      const existing = await prisma.villaPricePeriod.findFirst({
        where: { id: periodId, villaId },
        select: { id: true },
      });
      if (!existing) return { error: "Periyot bulunamadı" };

      await prisma.villaPricePeriod.update({
        where: { id: periodId },
        data: {
          startDate,
          endDate,
          ...periodData,
        },
      });

      await syncVillaPricePeriodDays(
        periodId,
        villaId,
        startDate,
        endDate,
        periodData as VillaPeriodDayPricingSnapshot
      );
    } else if (
      overlapping.length === 1 &&
      overlapping[0]!.id === periodId &&
      datesUnchanged
    ) {
      await prisma.villaPricePeriod.update({
        where: { id: periodId },
        data: {
          startDate,
          endDate,
          ...periodData,
        },
      });

      await syncVillaPricePeriodDays(
        periodId,
        villaId,
        startDate,
        endDate,
        periodData as VillaPeriodDayPricingSnapshot
      );
    } else {
      const mergeResult = await applyVillaPriceRangeMergedEdit(
        villaId,
        startDate,
        endDate,
        periodData as VillaPeriodDayPricingSnapshot,
        overlapping,
        extraRemoveIds
      );
      await revalidatePeriodPaths(villaId);
      return { success: true, removedPeriodIds: mergeResult.removedPeriodIds };
    }

    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Periyot güncellenemedi",
    };
  }
}

export async function updateVillaPricePeriodDaysPricing(
  villaId: string,
  formData: FormData
): Promise<VillaPeriodActionState> {
  await requireAdmin();

  const parsed = parsePeriodPricingFormData(formData);

  if (!parsed.success) {
    return { error: formatPeriodFormError(parsed.error) };
  }

  try {
    const { startDate, endDate } = parsePeriodDates(
      parsed.data.startDate,
      parsed.data.endDate
    );

    await applyVillaPriceRangeEdit(
      villaId,
      startDate,
      endDate,
      (period) =>
        buildPricingOnlyPeriodData(parsed.data, {
          discount1Rate: period.discount1Rate,
          discount2Rate: period.discount2Rate,
          extraDiscountAmount: period.extraDiscountAmount,
        }) as VillaPeriodDayPricingSnapshot
    );

    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Periyot günleri güncellenemedi",
    };
  }
}

export async function updateVillaPricePeriodDaysDiscounts(
  villaId: string,
  formData: FormData
): Promise<VillaPeriodActionState> {
  await requireAdmin();

  const parsed = parsePeriodDiscountFormData(formData);

  if (!parsed.success) {
    return { error: formatPeriodFormError(parsed.error) };
  }

  try {
    const { startDate, endDate } = parsePeriodDates(
      parsed.data.startDate,
      parsed.data.endDate
    );

    await applyVillaPriceRangeDiscountEdit(
      villaId,
      startDate,
      endDate,
      {
        discount1Rate: parsed.data.discount1Rate,
        discount2Rate: parsed.data.discount2Rate,
        extraDiscountAmount: parsed.data.extraDiscountAmount,
      },
      (period) =>
        buildDiscountOnlyPeriodData(parsed.data, period) as VillaPeriodDayPricingSnapshot
    );

    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "İndirim bilgileri güncellenemedi",
    };
  }
}

export async function updateVillaPeriodDaysOccupancy(
  villaId: string,
  startDateKey: string,
  endDateKey: string,
  mode: "EMPTY" | "BOOKED"
): Promise<VillaPeriodActionState> {
  await requireAdmin();

  try {
    await applyVillaPeriodDaysOccupancy(villaId, startDateKey, endDateKey, mode);
    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch (error) {
    if (error instanceof ConfirmedBookingOccupancyLockedError) {
      return {
        error: error.message,
        code: CONFIRMED_BOOKING_OCCUPANCY_LOCKED_CODE,
      };
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Uygunluk durumu güncellenemedi",
    };
  }
}

export async function deleteVillaPricePeriod(
  villaId: string,
  periodId: string
): Promise<VillaPeriodActionState> {
  await requireAdmin();

  try {
    await prisma.villaPricePeriod.delete({
      where: { id: periodId },
    });
    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch {
    return { error: "Periyot silinemedi" };
  }
}
