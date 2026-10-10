import * as XLSX from "xlsx";
import {
  getMonthLabel,
  MONTHLY_LISTING_TABLE_HEADERS,
  monthlyListingRowToCells,
  type MonthlyListingReportRow,
} from "@/lib/monthly-listing-report";

export const MONTHLY_LISTING_REPORT_EMAIL = "info@tatildeyiz.com.tr";
export const MONTHLY_LISTING_EMAIL_SUBJECT = "AYLIK İLAN RAPORU";
export const MONTHLY_LISTING_EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function formatMonthlyListingPeriodLabel(year: number, month: number) {
  const label = getMonthLabel(month) || String(month);
  return `${label} ${year}`;
}

export function buildMonthlyListingExcelBuffer(rows: MonthlyListingReportRow[]) {
  const sheetRows = [
    [...MONTHLY_LISTING_TABLE_HEADERS],
    ...rows.map((row) => monthlyListingRowToCells(row)),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Aylik Ilan Raporu");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array);
}

export type MonthlyListingMailSummary = {
  year: number;
  month: number;
  listingDateRange: string;
  count: number;
  test?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildMonthlyListingReportText(summary: MonthlyListingMailSummary) {
  const period = formatMonthlyListingPeriodLabel(summary.year, summary.month);
  const lines = [
    "Bilgilendirme",
    summary.test ? "Bu bir TEST mailidir." : null,
    `Aylık İlan Raporu (7464 S.K.) — ${period}`,
    `İlan tarih aralığı: ${summary.listingDateRange}`,
    `Kayıt: ${summary.count}`,
    summary.count > 0
      ? "Excel ektedir. Panelde site seçilmeden alınan raporla aynıdır."
      : "Bu dönem için ilan kaydı bulunamadı.",
    "",
    "Bilgilerinize",
    "BONT",
  ].filter((line): line is string => line != null);
  return lines.join("\n");
}

export function buildMonthlyListingReportHtml(summary: MonthlyListingMailSummary) {
  const period = formatMonthlyListingPeriodLabel(summary.year, summary.month);
  const testBanner = summary.test
    ? `<p style="color:#b45309;"><strong>Bu bir TEST mailidir.</strong></p>`
    : "";
  const result =
    summary.count > 0
      ? `<p>Excel ektedir. Panelde site seçilmeden alınan raporla aynıdır.</p>`
      : `<p>Bu dönem için ilan kaydı bulunamadı.</p>`;

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <p><strong>Bilgilendirme</strong></p>
      ${testBanner}
      <p>Aylık İlan Raporu (7464 S.K.) — <strong>${escapeHtml(period)}</strong><br>
      İlan tarih aralığı: <strong>${escapeHtml(summary.listingDateRange)}</strong><br>
      Kayıt: <strong>${summary.count}</strong></p>
      ${result}
      <p>Bilgilerinize<br><strong>BONT</strong></p>
    </div>
  `;
}
