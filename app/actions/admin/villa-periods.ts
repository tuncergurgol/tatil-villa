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
  parseDateKey,
  periodsOverlap,
  startOfDay,
  toDateKey,
} from "@/lib/villa-period-calendar";
import {
  buildBookedOccupancyForStay,
  buildEmptyOccupancyForRange,
  enumerateDateKeysInRange,
  normalizeDateRange,
  offsetDateKey,
} from "@/lib/villa-period-selection";
import type { VillaDayOccupancy } from "@prisma/client";
import {
  syncVillaPricePeriodDays,
} from "@/lib/villa-period-day-sync";
import type { VillaPeriodDayPricingSnapshot } from "@/lib/villa-period-days";
import {
  parseAvailability,
  parseCurrency,
  resolveVillaPeriodPricing,
} from "@/lib/villa-period-pricing";

export type VillaPeriodActionState = {
  success?: boolean;
  error?: string;
};

const optionalRateSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.min(100, Math.round(parsed));
  });

const periodSchema = z.object({
  startDate: z.string().min(1, "Başlangıç tarihi gerekli"),
  endDate: z.string().min(1, "Bitiş tarihi gerekli"),
  availability: z.enum(["available", "closed"]),
  nightlyPrice: z.coerce.number().int().positive("Gecelik fiyat pozitif olmalı"),
  nightlyPriceCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  weeklyPrice: z.coerce.number().int().positive().optional().nullable(),
  prepaymentRate: optionalRateSchema,
  commissionRate: optionalRateSchema,
  nightlyPriceWithoutCommission: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  minStayNights: z.coerce.number().int().positive().optional().nullable(),
  cleaningDayCount: z.coerce.number().int().positive().optional().nullable(),
  cleaningFee: z.coerce.number().int().positive().optional().nullable(),
  cleaningFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  damageDeposit: z.coerce.number().int().positive().optional().nullable(),
  damageDepositCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  petCleaningFee: z.coerce.number().int().positive().optional().nullable(),
  petCleaningFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  petDamageDeposit: z.coerce.number().int().positive().optional().nullable(),
  petDamageDepositCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  underfloorHeatingFee: z.coerce.number().int().positive().optional().nullable(),
  underfloorHeatingFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  extraBedFee: z.coerce.number().int().positive().optional().nullable(),
  extraBedFeeCurrency: z.enum(["TL", "EUR", "USD", "GBP"]),
  discount1Rate: optionalRateSchema,
  discount2Rate: optionalRateSchema,
  extraDiscountAmount: z.coerce.number().int().positive().optional().nullable(),
  weekendPrice: z.coerce.number().int().positive().optional().nullable(),
  weekendDays: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return [] as number[];
      return value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    }),
  weekendMinStayNights: z.coerce.number().int().positive().optional().nullable(),
  childFee02: z.coerce.number().int().positive().optional().nullable(),
  childFee02Currency: z.enum(["TL", "EUR", "USD", "GBP"]),
  childFee03_09: z.coerce.number().int().positive().optional().nullable(),
  childFee03_09Currency: z.enum(["TL", "EUR", "USD", "GBP"]),
});

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

async function assertNoOverlap(
  villaId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string
) {
  const existing = await prisma.villaPricePeriod.findMany({
    where: {
      villaId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, startDate: true, endDate: true },
  });

  const hasOverlap = existing.some((period) =>
    periodsOverlap(
      { startDate, endDate },
      { startDate: period.startDate, endDate: period.endDate }
    )
  );

  if (hasOverlap) {
    throw new Error("Bu tarih aralığı mevcut bir periyot ile çakışıyor");
  }
}

function parsePeriodDates(startRaw: string, endRaw: string) {
  const startDate = startOfDay(parseDateKey(startRaw));
  const endDate = startOfDay(parseDateKey(endRaw));

  if (compareDates(startDate, endDate) > 0) {
    throw new Error("Bitiş tarihi başlangıçtan önce olamaz");
  }

  return { startDate, endDate };
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

export async function createVillaPricePeriod(
  villaId: string,
  formData: FormData
): Promise<VillaPeriodActionState> {
  await requireAdmin();

  const parsed = parsePeriodFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    const { startDate, endDate } = parsePeriodDates(
      parsed.data.startDate,
      parsed.data.endDate
    );
    await assertNoOverlap(villaId, startDate, endDate);

    const periodData = buildPeriodData(parsed.data);

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

    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Periyot oluşturulamadı",
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
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    const { startDate, endDate } = parsePeriodDates(
      parsed.data.startDate,
      parsed.data.endDate
    );
    await assertNoOverlap(villaId, startDate, endDate, periodId);

    const periodData = buildPeriodData(parsed.data);

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

    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Periyot güncellenemedi",
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
    const { start, end } = normalizeDateRange(startDateKey, endDateKey);
    const rangeDateKeys = enumerateDateKeysInRange(start, end);
    const lookupDateKeys = [
      ...new Set([
        ...rangeDateKeys,
        offsetDateKey(start, -1),
        offsetDateKey(end, 1),
      ]),
    ];

    const existingDays = await prisma.villaPricePeriodDay.findMany({
      where: {
        villaId,
        date: { in: lookupDateKeys.map((dateKey) => dateKeyToDbDate(dateKey)) },
      },
      select: {
        date: true,
        occupancyStatus: true,
      },
    });

    const existingOccupancyByDateKey = new Map<string, VillaDayOccupancy>();
    for (const day of existingDays) {
      existingOccupancyByDateKey.set(
        toDateKey(startOfDay(day.date)),
        day.occupancyStatus
      );
    }

    const occupancyByDateKey: Map<string, VillaDayOccupancy> =
      mode === "BOOKED"
        ? buildBookedOccupancyForStay(start, end, existingOccupancyByDateKey)
        : buildEmptyOccupancyForRange(start, end, existingOccupancyByDateKey);

    const updates = [...occupancyByDateKey.entries()]
      .filter(([dateKey, occupancyStatus]) => {
        const existing = existingOccupancyByDateKey.get(dateKey) ?? "EMPTY";
        return existing !== occupancyStatus;
      })
      .map(([dateKey, occupancyStatus]) =>
        prisma.villaPricePeriodDay.updateMany({
          where: {
            villaId,
            date: dateKeyToDbDate(dateKey),
          },
          data: { occupancyStatus },
        })
      );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    await revalidatePeriodPaths(villaId);
    return { success: true };
  } catch (error) {
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
