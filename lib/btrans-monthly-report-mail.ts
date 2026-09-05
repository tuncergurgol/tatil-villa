import * as XLSX from "xlsx";
import type { BtransIncompleteRow } from "@/lib/btrans-report";

export const BTRANS_MONTHLY_REPORT_EMAIL = "info@tatildeyiz.com.tr";
export const BTRANS_MONTHLY_EMAIL_SUBJECT = "BTRANS BİLDİRİMİ (538)";

export const BTRANS_XML_MIME = "application/xml";
export const BTRANS_EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MONTH_LABELS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

export function formatBtransPeriodLabel(year: number, month: number): string {
  const label = MONTH_LABELS_TR[month - 1] ?? String(month);
  return `${label} ${year}`;
}

export function escapeBtransMailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatCheckInDisplay(value: string) {
  if (value.length !== 8) return value;
  return `${value.slice(6, 8)}.${value.slice(4, 6)}.${value.slice(0, 4)}`;
}

export function buildBtransIncompleteExcelBuffer(
  rows: BtransIncompleteRow[]
): Buffer {
  const sheetRows = [
    [
      "Rez. No",
      "Tesis",
      "İl",
      "İlçe",
      "Ev Sahibi",
      "Giriş",
      "Eksik Alanlar",
    ],
    ...rows.map((row) => [
      row.externalCode,
      row.villaName,
      row.il,
      row.ilce,
      row.ownerName,
      formatCheckInDisplay(row.checkIn),
      row.missing.join(" / "),
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BTRANS Eksik Kayitlar");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array);
}

export type BtransMonthlyMailSummary = {
  year: number;
  month: number;
  dateBasisLabel: string;
  count: number;
  incompleteCount: number;
  incomplete: BtransIncompleteRow[];
  warnings: string[];
  error?: string;
  test?: boolean;
};

export function buildBtransMonthlyReportText(summary: BtransMonthlyMailSummary) {
  const period = formatBtransPeriodLabel(summary.year, summary.month);
  const lines = [
    "Bilgilendirme",
    summary.test ? "Bu bir TEST mailidir." : null,
    `BTRANS Bildirimi (538) — ${period}`,
    `Tarih bazı: ${summary.dateBasisLabel}`,
    `XML'e alınan işlem: ${summary.count}`,
    `Eksik / hatalı kayıt: ${summary.incompleteCount}`,
  ].filter((line): line is string => Boolean(line));

  if (summary.error) {
    lines.push("", `Hata: ${summary.error}`);
  } else if (summary.count > 0) {
    lines.push("", "BTRANS XML ektedir. GİB test ekranında doğrulayıp yükleyebilirsiniz.");
  } else {
    lines.push("", "Bu dönem için XML'e alınacak onaylı rezervasyon bulunamadı.");
  }

  if (summary.incompleteCount > 0) {
    lines.push("", "Eksik kayıtlar Excel ektedir.");
    for (const row of summary.incomplete.slice(0, 20)) {
      lines.push(
        `${row.externalCode || "-"} — ${row.villaName} / ${row.ownerName || "-"} (${row.missing.join(", ")})`
      );
    }
    if (summary.incomplete.length > 20) {
      lines.push(`… ve ${summary.incomplete.length - 20} kayıt daha (Excel'de).`);
    }
  }

  for (const warning of summary.warnings) {
    lines.push("", warning);
  }

  lines.push("", "Bilgilerinize", "BONT");
  return lines.join("\n");
}

export function buildBtransMonthlyReportHtml(summary: BtransMonthlyMailSummary) {
  const period = formatBtransPeriodLabel(summary.year, summary.month);
  const testBanner = summary.test
    ? `<p style="color:#b45309;"><strong>Bu bir TEST mailidir.</strong></p>`
    : "";
  const errorBlock = summary.error
    ? `<p style="color:#b91c1c;"><strong>Hata:</strong> ${escapeBtransMailHtml(summary.error)}</p>`
    : "";
  const resultLine =
    summary.count > 0
      ? `<p>BTRANS XML ektedir. GİB test ekranında doğrulayıp yükleyebilirsiniz.</p>`
      : `<p>Bu dönem için XML'e alınacak onaylı rezervasyon bulunamadı.</p>`;
  const incompleteBlock =
    summary.incompleteCount > 0
      ? `
        <p>Eksik / hatalı kayıt: <strong>${summary.incompleteCount}</strong> (Excel ektedir)</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px;width:100%;max-width:860px;">
          <thead>
            <tr>
              <th align="left">Rez. No</th>
              <th align="left">Tesis</th>
              <th align="left">Ev Sahibi</th>
              <th align="left">Eksik</th>
            </tr>
          </thead>
          <tbody>
            ${summary.incomplete
              .slice(0, 30)
              .map(
                (row) => `
              <tr>
                <td>${escapeBtransMailHtml(row.externalCode || "-")}</td>
                <td>${escapeBtransMailHtml(row.villaName)}</td>
                <td>${escapeBtransMailHtml(row.ownerName || "-")}</td>
                <td>${escapeBtransMailHtml(row.missing.join(", "))}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
        ${
          summary.incomplete.length > 30
            ? `<p>… ve ${summary.incomplete.length - 30} kayıt daha (Excel'de).</p>`
            : ""
        }
      `
      : "";
  const warningsBlock =
    summary.warnings.length > 0
      ? summary.warnings
          .map(
            (warning) =>
              `<p>${escapeBtransMailHtml(warning)}</p>`
          )
          .join("")
      : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <p><strong>Bilgilendirme</strong></p>
      ${testBanner}
      <p>BTRANS Bildirimi (538) — <strong>${escapeBtransMailHtml(period)}</strong><br>
      Tarih bazı: <strong>${escapeBtransMailHtml(summary.dateBasisLabel)}</strong></p>
      <p>XML'e alınan işlem: <strong>${summary.count}</strong><br>
      Eksik / hatalı kayıt: <strong>${summary.incompleteCount}</strong></p>
      ${errorBlock}
      ${resultLine}
      ${incompleteBlock}
      ${warningsBlock}
      <p>Bilgilerinize<br><strong>BONT</strong></p>
    </div>
  `;
}
