"use server";

import { PeriodImportStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { importVillaPeriodsFromTatildeyiz } from "@/lib/tatildeyiz-period-import-runner";
import { villaTakvimPath } from "@/lib/villa-takvim-path";

type ImportActionResult = {
  success: boolean;
  message: string;
  importedCount?: number;
  failedCount?: number;
};

function revalidateImportPage(fromVillaId: number, toVillaId: number) {
  revalidatePath(
    `/admin/acente/takvim-import?from=${fromVillaId}&to=${toVillaId}`
  );
  revalidatePath("/admin/acente/takvim-import");
}

function parseVillaIdRange(fromVillaId: number, toVillaId: number) {
  const from = Math.floor(fromVillaId);
  const to = Math.floor(toVillaId);

  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < 1) {
    return { error: "VillaID değerleri 1 veya daha büyük olmalıdır" };
  }
  if (from > to) {
    return { error: "İlk VillaID, son VillaID'den büyük olamaz" };
  }

  return { from, to };
}

async function runSingleImport(villa: { id: string; slug: string }) {
  const now = new Date();
  const existing = await prisma.villaPeriodImportLog.findUnique({
    where: { villaId: villa.id },
    select: { retryCount: true },
  });

  try {
    const result = await importVillaPeriodsFromTatildeyiz(villa.id, villa.slug);
    await prisma.villaPeriodImportLog.upsert({
      where: { villaId: villa.id },
      create: {
        villaId: villa.id,
        sourceSlug: villa.slug,
        status: PeriodImportStatus.SUCCESS,
        message: "Aktarım başarılı",
        periodCount: result.periodCount,
        dayCount: result.dayCount,
        bookedDays: result.bookedDays,
        optionDays: result.optionDays,
        retryCount: (existing?.retryCount ?? 0) + 1,
        attemptedAt: now,
        succeededAt: now,
      },
      update: {
        sourceSlug: villa.slug,
        status: PeriodImportStatus.SUCCESS,
        message: "Aktarım başarılı",
        periodCount: result.periodCount,
        dayCount: result.dayCount,
        bookedDays: result.bookedDays,
        optionDays: result.optionDays,
        retryCount: { increment: 1 },
        attemptedAt: now,
        succeededAt: now,
      },
    });
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Aktarım hatası";
    await prisma.villaPeriodImportLog.upsert({
      where: { villaId: villa.id },
      create: {
        villaId: villa.id,
        sourceSlug: villa.slug,
        status: PeriodImportStatus.ERROR,
        message,
        retryCount: (existing?.retryCount ?? 0) + 1,
        attemptedAt: now,
      },
      update: {
        sourceSlug: villa.slug,
        status: PeriodImportStatus.ERROR,
        message,
        periodCount: 0,
        dayCount: 0,
        bookedDays: 0,
        optionDays: 0,
        retryCount: { increment: 1 },
        attemptedAt: now,
      },
    });
    return { success: false as const, message };
  }
}

export async function runVillaPeriodImportBatchAction(
  fromVillaId: number,
  toVillaId: number
): Promise<ImportActionResult> {
  await requireAdmin();

  const range = parseVillaIdRange(fromVillaId, toVillaId);
  if ("error" in range) {
    return { success: false, message: range.error ?? "Geçersiz villa aralığı" };
  }

  const villas = await prisma.villa.findMany({
    where: { villaId: { gte: range.from, lte: range.to } },
    orderBy: { villaId: "asc" },
    select: { id: true, slug: true },
  });

  if (villas.length === 0) {
    return { success: false, message: "Seçilen aralıkta villa bulunamadı" };
  }

  let importedCount = 0;
  let failedCount = 0;

  for (const villa of villas) {
    const result = await runSingleImport(villa);
    if (result.success) importedCount += 1;
    else failedCount += 1;
  }

  revalidateImportPage(range.from, range.to);
  return {
    success: true,
    message: `VillaID ${range.from}-${range.to} aralığında aktarım tamamlandı. Başarılı: ${importedCount}, Hatalı: ${failedCount}`,
    importedCount,
    failedCount,
  };
}

export async function retryFailedVillaPeriodImportsAction(
  fromVillaId: number,
  toVillaId: number
): Promise<ImportActionResult> {
  await requireAdmin();

  const range = parseVillaIdRange(fromVillaId, toVillaId);
  if ("error" in range) {
    return { success: false, message: range.error ?? "Geçersiz villa aralığı" };
  }

  const failed = await prisma.villaPeriodImportLog.findMany({
    where: {
      status: PeriodImportStatus.ERROR,
      villa: { villaId: { gte: range.from, lte: range.to } },
    },
    select: { villaId: true, sourceSlug: true },
  });

  if (failed.length === 0) {
    return { success: true, message: "Yeniden denenecek hatalı kayıt yok" };
  }

  let importedCount = 0;
  let failedCount = 0;

  for (const item of failed) {
    const result = await runSingleImport({ id: item.villaId, slug: item.sourceSlug });
    if (result.success) importedCount += 1;
    else failedCount += 1;
  }

  revalidateImportPage(range.from, range.to);
  return {
    success: true,
    message: `VillaID ${range.from}-${range.to} aralığında yeniden deneme tamamlandı. Başarılı: ${importedCount}, Hatalı: ${failedCount}`,
    importedCount,
    failedCount,
  };
}

export async function retryVillaPeriodImportByVillaIdAction(
  villaId: string
): Promise<ImportActionResult> {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, slug: true, name: true },
  });
  if (!villa) return { success: false, message: "Villa bulunamadı" };

  const result = await runSingleImport(villa);
  revalidatePath("/admin/acente/takvim-import");
  if (!result.success) {
    return {
      success: false,
      message: result.message || `${villa.name} için aktarım başarısız`,
    };
  }
  return { success: true, message: `${villa.name} için aktarım başarılı` };
}

/**
 * Tek villa takvim/fiyat periyotlarını Tatildeyiz'den yeniden aktarır.
 * Mevcut periyot + gün kayıtlarını silip üzerine yazar (production runner).
 */
export async function importVillaPeriodsFromTatildeyizAction(
  villaId: string
): Promise<ImportActionResult & { periodCount?: number; dayCount?: number }> {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, slug: true, name: true, villaId: true },
  });
  if (!villa) return { success: false, message: "Villa bulunamadı" };

  const result = await runSingleImport(villa);

  revalidatePath("/admin/acente/takvim-import");
  revalidatePath("/admin/konaklama/takvim");
  revalidatePath(villaTakvimPath(villa));

  if (!result.success) {
    return {
      success: false,
      message:
        result.message ||
        `${villa.name} için fiyat/takvim aktarımı başarısız`,
    };
  }

  const log = await prisma.villaPeriodImportLog.findUnique({
    where: { villaId: villa.id },
    select: { periodCount: true, dayCount: true },
  });

  return {
    success: true,
    message: `${villa.name}: ${log?.periodCount ?? 0} periyot, ${log?.dayCount ?? 0} gün Tatildeyiz'den aktarıldı`,
    periodCount: log?.periodCount,
    dayCount: log?.dayCount,
  };
}
