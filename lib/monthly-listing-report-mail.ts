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

const MAIL_INTRO = [
  "Merhabalar,",
  "",
  "KONUTLARIN TURİZM AMAÇLI KİRALANMASINI SAĞLAYAN ARACI HİZMET SAĞLAYICILARININ BAKANLIĞA YAPACAKLARI BİLDİRİMLERE İLİŞKİN TEBLİĞ kapsamında hazırlamış olduğumuz excel listesi ekte tarafınıza sunulmuştur.",
].join("\n");

const MAIL_SIGNATURE = ["Saygılarımızla", "12970 Glamping Turizm", "Tunçer Gürgöl"].join(
  "\n"
);

export type DuplicatePermitGroup = {
  permitNo: string;
  rows: MonthlyListingReportRow[];
};

function permitKey(value: string) {
  return value.replace(/\s+/g, "").toLocaleUpperCase("tr-TR");
}

/** Aynı konut izin belge numarasıyla birden fazla ilan. */
export function findDuplicatePermitNumbers(
  rows: MonthlyListingReportRow[]
): DuplicatePermitGroup[] {
  const groups = new Map<string, DuplicatePermitGroup>();
  for (const row of rows) {
    const permitNo = row.housingPermitNo.trim();
    if (!permitNo || permitNo === "-") continue;
    const key = permitKey(permitNo);
    const current = groups.get(key);
    if (current) {
      current.rows.push(row);
    } else {
      groups.set(key, { permitNo, rows: [row] });
    }
  }
  return [...groups.values()]
    .filter((group) => group.rows.length > 1)
    .sort((left, right) => left.permitNo.localeCompare(right.permitNo, "tr"));
}

function duplicateLines(groups: DuplicatePermitGroup[]) {
  if (groups.length === 0) {
    return ["Bilgi: Mükerrer konut izin belge numarası bulunmamaktadır."];
  }
  const lines = [
    "Bilgi amaçlı mükerrer konut izin belge numaraları:",
    "",
  ];
  for (const group of groups) {
    lines.push(`${group.permitNo} (${group.rows.length} kayıt)`);
    for (const row of group.rows) {
      lines.push(`- ${row.listingOwner} — ${row.listingUrl}`);
    }
    lines.push("");
  }
  return lines;
}

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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildMonthlyListingReportText(groups: DuplicatePermitGroup[]) {
  return [MAIL_INTRO, "", ...duplicateLines(groups), MAIL_SIGNATURE].join("\n");
}

export function buildMonthlyListingReportHtml(groups: DuplicatePermitGroup[]) {
  const duplicateHtml =
    groups.length === 0
      ? `<p>Bilgi: Mükerrer konut izin belge numarası bulunmamaktadır.</p>`
      : `
        <p><strong>Bilgi amaçlı mükerrer konut izin belge numaraları:</strong></p>
        ${groups
          .map(
            (group) => `
          <p><strong>${escapeHtml(group.permitNo)}</strong> (${group.rows.length} kayıt)</p>
          <ul>
            ${group.rows
              .map(
                (row) =>
                  `<li>${escapeHtml(row.listingOwner)} — ${escapeHtml(row.listingUrl)}</li>`
              )
              .join("")}
          </ul>`
          )
          .join("")}
      `;

  return `
    <div style="font-family:Calibri,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">
      <p>Merhabalar,</p>
      <p>KONUTLARIN TURİZM AMAÇLI KİRALANMASINI SAĞLAYAN ARACI HİZMET SAĞLAYICILARININ BAKANLIĞA YAPACAKLARI BİLDİRİMLERE İLİŞKİN TEBLİĞ kapsamında hazırlamış olduğumuz excel listesi ekte tarafınıza sunulmuştur.</p>
      ${duplicateHtml}
      <p>Saygılarımızla<br>12970 Glamping Turizm<br>Tunçer Gürgöl</p>
    </div>
  `;
}
