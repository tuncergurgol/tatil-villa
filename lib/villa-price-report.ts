import type { VillaPeriodAvailability, VillaPeriodCurrency } from "@/lib/villa-period-pricing";
import {
  deriveWeeklyFromNightly,
  formatMoneyAmount,
} from "@/lib/villa-period-pricing";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";

export const VILLA_PRICE_REPORT_HEADERS = [
  "AKTİF/PASİF",
  "VILLA ID",
  "VILLA ADI",
  "BOLGE (IL/İLÇE/MAHALLE)",
  "PERİYOT BİLGİLERİ",
  "Periyot Tarihleri",
  "Gecelik Konaklama Bedeli",
  "Haftalık Konaklama Bedeli",
  "Komisyon Oranı",
  "Ön Ödeme Oranı",
  "Minimum Konaklama Gün",
  "Temizlik Gün Sayısı",
  "Komisyonsuz Konaklama Bedeli",
  "Ek Yatak Bedeli",
  "Temizlik Bedeli",
  "Evcil Hayvan Temizlik Bedeli",
  "Yerden Isıtma Bedeli",
  "Hasar Depozitosu",
  "Evcil Hayvan Hasar Depozitosu",
] as const;

export type VillaPriceReportPeriodInput = {
  availability: VillaPeriodAvailability;
  startDate: Date;
  endDate: Date;
  nightlyPrice: number;
  nightlyPriceCurrency: VillaPeriodCurrency;
  weeklyPrice: number | null;
  commissionRate: number | null;
  prepaymentRate: number | null;
  minStayNights: number | null;
  cleaningDayCount: number | null;
  nightlyPriceWithoutCommission: number | null;
  extraBedFee: number | null;
  extraBedFeeCurrency: VillaPeriodCurrency;
  cleaningFee: number | null;
  cleaningFeeCurrency: VillaPeriodCurrency;
  petCleaningFee: number | null;
  petCleaningFeeCurrency: VillaPeriodCurrency;
  underfloorHeatingFee: number | null;
  underfloorHeatingFeeCurrency: VillaPeriodCurrency;
  damageDeposit: number | null;
  damageDepositCurrency: VillaPeriodCurrency;
  petDamageDeposit: number | null;
  petDamageDepositCurrency: VillaPeriodCurrency;
};

export type VillaPriceReportVillaInput = {
  active: boolean;
  villaId: number | null;
  name: string;
  regionLabel: string;
  periods: VillaPriceReportPeriodInput[];
};

function formatReportDate(date: Date) {
  const key = dbDateToDateKey(date);
  const [year, month, day] = key.split("-");
  return `${day}.${month}.${year}`;
}

function formatPeriodDateRange(startDate: Date, endDate: Date) {
  return `${formatReportDate(startDate)} - ${formatReportDate(endDate)}`;
}

function formatPeriodAvailability(availability: VillaPeriodAvailability) {
  return availability === "closed" ? "Kapalı" : "Müsait";
}

function formatMoneyWithCurrency(
  amount: number | null | undefined,
  currency: VillaPeriodCurrency
) {
  if (amount == null || amount <= 0) return "";
  return `${formatMoneyAmount(amount)} ${currency}`;
}

function formatRate(value: number | null | undefined) {
  if (value == null) return "";
  return value;
}

function formatCount(value: number | null | undefined) {
  if (value == null) return "";
  return value;
}

function resolveWeeklyPrice(period: VillaPriceReportPeriodInput) {
  if (period.weeklyPrice != null && period.weeklyPrice > 0) {
    return period.weeklyPrice;
  }
  return deriveWeeklyFromNightly(period.nightlyPrice);
}

export function buildVillaPriceReportRows(
  villas: VillaPriceReportVillaInput[]
): (string | number)[][] {
  const rows: (string | number)[][] = [[...VILLA_PRICE_REPORT_HEADERS]];

  for (const villa of villas) {
    const periods = villa.periods.length > 0 ? villa.periods : [null];

    periods.forEach((period, index) => {
      if (!period) {
        rows.push([
          villa.active ? "Aktif" : "Pasif",
          villa.villaId ?? "",
          villa.name,
          villa.regionLabel,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
        return;
      }

      const weeklyPrice = resolveWeeklyPrice(period);

      rows.push([
        villa.active ? "Aktif" : "Pasif",
        villa.villaId ?? "",
        villa.name,
        villa.regionLabel,
        `Periyot ${index + 1} (${formatPeriodAvailability(period.availability)})`,
        formatPeriodDateRange(period.startDate, period.endDate),
        formatMoneyWithCurrency(
          period.nightlyPrice,
          period.nightlyPriceCurrency
        ),
        weeklyPrice
          ? formatMoneyWithCurrency(
              weeklyPrice,
              period.nightlyPriceCurrency
            )
          : "",
        formatRate(period.commissionRate),
        formatRate(period.prepaymentRate),
        formatCount(period.minStayNights),
        formatCount(period.cleaningDayCount),
        formatMoneyWithCurrency(
          period.nightlyPriceWithoutCommission,
          period.nightlyPriceCurrency
        ),
        formatMoneyWithCurrency(
          period.extraBedFee,
          period.extraBedFeeCurrency
        ),
        formatMoneyWithCurrency(period.cleaningFee, period.cleaningFeeCurrency),
        formatMoneyWithCurrency(
          period.petCleaningFee,
          period.petCleaningFeeCurrency
        ),
        formatMoneyWithCurrency(
          period.underfloorHeatingFee,
          period.underfloorHeatingFeeCurrency
        ),
        formatMoneyWithCurrency(
          period.damageDeposit,
          period.damageDepositCurrency
        ),
        formatMoneyWithCurrency(
          period.petDamageDeposit,
          period.petDamageDepositCurrency
        ),
      ]);
    });
  }

  return rows;
}

export function buildVillaPriceReportFilename() {
  const stamp = new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date())
    .replace(/[.:]/g, "-")
    .replace(/\s+/g, "_");

  return `villa-fiyat-raporu-${stamp}.xlsx`;
}

export async function downloadVillaPriceReportExcel(
  rows: (string | number)[][],
  fileName: string
) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Villa Fiyat Raporu");
  XLSX.writeFile(workbook, fileName);
}
