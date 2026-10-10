import * as XLSX from "xlsx";
import {
  MONTHLY_LISTING_TABLE_HEADERS,
  monthlyListingRowToCells,
  type MonthlyListingReportRow,
} from "@/lib/monthly-listing-report";

export const MONTHLY_LISTING_REPORT_EMAIL = "info@tatildeyiz.com.tr";
export const MONTHLY_LISTING_FROM_EMAIL = "tuncer@tatildeyiz.com.tr";
export const MONTHLY_LISTING_EMAIL_SUBJECT =
  "12970 Glamping Turizm - Satışını ve pazarlamasını yapmış olduğumuz Turizm amaçlı Konutların listesi";
export const MONTHLY_LISTING_EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MONTH_FILE_SLUGS = [
  "ocak",
  "subat",
  "mart",
  "nisan",
  "mayis",
  "haziran",
  "temmuz",
  "agustos",
  "eylul",
  "ekim",
  "kasim",
  "aralik",
] as const;

const MAIL_BODY = [
  "Merhabalar,",
  "",
  "KONUTLARIN TURİZM AMAÇLI KİRALANMASINI SAĞLAYAN ARACI HİZMET SAĞLAYICILARININ BAKANLIĞA YAPACAKLARI BİLDİRİMLERE İLİŞKİN TEBLİĞ kapsamında hazırlamış olduğumuz excel listesi ekte tarafınıza sunulmuştur.",
  "",
  "Saygılarımızla",
  "12970 Glamping Turizm",
  "Tunçer Gürgöl",
].join("\n");

export function monthlyListingAttachmentName(year: number, month: number) {
  const slug = MONTH_FILE_SLUGS[month - 1] ?? String(month);
  return `aylik ilan raporu ${year} ${slug}.xlsx`;
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

export function buildMonthlyListingReportText() {
  return MAIL_BODY;
}

export function buildMonthlyListingReportHtml() {
  const [greeting, , paragraph, , closing, agency, name] = MAIL_BODY.split("\n");
  return `
    <div style="font-family:Calibri,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">
      <p>${greeting}</p>
      <p>${paragraph}</p>
      <p>${closing}<br>${agency}<br>${name}</p>
    </div>
  `;
}
