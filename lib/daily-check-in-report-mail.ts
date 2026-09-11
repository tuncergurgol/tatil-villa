import * as XLSX from "xlsx";

export const DAILY_CHECK_IN_REPORT_EMAIL = "info@tatildeyiz.com.tr";
export const INVOICE_DAILY_EMAIL_SUBJECT = "KONAKLAMA FATURALARI";
export const OWNER_PAYMENT_DAILY_EMAIL_SUBJECT = "EV SAHİBİ ÖDEMELERİ";

export const DAILY_REPORT_EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type DailyReportMailSummary = {
  checkInDateKey: string;
  matchedCount: number;
  exportCount: number;
  incompleteCount: number;
  paidCount?: number;
  incomplete: Array<{
    externalCode: string;
    guestName: string;
    villaName: string;
    missing: string[];
  }>;
};

export function formatDateKeyTr(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return dateKey;
  return `${day}.${month}.${year}`;
}

export function workbookBufferFromRows(
  rows: (string | number)[][],
  sheetName = "Sayfa1"
): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array);
}

export function escapeDailyReportHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function incompleteLabel(row: DailyReportMailSummary["incomplete"][number]) {
  return `${row.externalCode} — ${row.guestName} / ${row.villaName} (${row.missing.join(", ")})`;
}

export function buildDailyInvoiceReportText(summary: DailyReportMailSummary) {
  const checkInLabel = formatDateKeyTr(summary.checkInDateKey);
  const lines = [
    "Bilgilendirme",
    `Giriş tarihi: ${checkInLabel} (giriş gününden 1 gün sonra, onaylı rezervasyonlar)`,
    `Onaylı rezervasyon: ${summary.matchedCount}`,
    `Excel'e alınan konaklama faturası: ${summary.exportCount}`,
  ];

  if (summary.incompleteCount > 0) {
    lines.push(
      `Eksik bilgi nedeniyle Excel'e alınmayan: ${summary.incompleteCount}`
    );
  }

  if (summary.exportCount > 0) {
    lines.push("", "Konaklama faturaları Excel ektedir.");
  } else {
    lines.push(
      "",
      "Bugün gönderilecek konaklama faturası bulunmamaktadır."
    );
  }

  if (summary.incomplete.length > 0) {
    lines.push("", "Eksik kayıtlar:");
    for (const row of summary.incomplete) {
      lines.push(incompleteLabel(row));
    }
  }

  lines.push("", "Bilgilerinize", "BONT");
  return lines.join("\n");
}

export function buildDailyOwnerPaymentReportText(
  summary: DailyReportMailSummary
) {
  const checkInLabel = formatDateKeyTr(summary.checkInDateKey);
  const lines = [
    "Bilgilendirme",
    `Giriş tarihi: ${checkInLabel} (giriş gününden 1 gün sonra, onaylı rezervasyonlar)`,
    `Onaylı rezervasyon: ${summary.matchedCount}`,
    `Excel'e alınan ev sahibi ödemesi: ${summary.exportCount}`,
  ];

  if ((summary.paidCount ?? 0) > 0) {
    lines.push(
      `Ödemesi kalmayan (daha önce ödenmiş / tutar yok): ${summary.paidCount}`
    );
  }
  if (summary.incompleteCount > 0) {
    lines.push(
      `Eksik bilgi nedeniyle Excel'e alınmayan: ${summary.incompleteCount}`
    );
  }

  if (summary.exportCount > 0) {
    lines.push("", "Ev sahibi ödemeleri Excel ektedir.");
  } else {
    lines.push("", "Bugün gönderilecek ev sahibi ödemesi bulunmamaktadır.");
  }

  if (summary.incomplete.length > 0) {
    lines.push("", "Eksik kayıtlar:");
    for (const row of summary.incomplete) {
      lines.push(incompleteLabel(row));
    }
  }

  lines.push("", "Bilgilerinize", "BONT");
  return lines.join("\n");
}

export function buildDailyReportHtml(input: {
  title: string;
  checkInDateKey: string;
  matchedCount: number;
  exportCount: number;
  incompleteCount: number;
  paidCount?: number;
  emptyMessage: string;
  attachedMessage: string;
  incomplete: DailyReportMailSummary["incomplete"];
}) {
  const checkInLabel = formatDateKeyTr(input.checkInDateKey);
  const paidLine =
    (input.paidCount ?? 0) > 0
      ? `<p>Ödemesi kalmayan (daha önce ödenmiş / tutar yok): <strong>${input.paidCount}</strong></p>`
      : "";
  const incompleteLine =
    input.incompleteCount > 0
      ? `<p>Eksik bilgi nedeniyle Excel'e alınmayan: <strong>${input.incompleteCount}</strong></p>`
      : "";
  const resultLine =
    input.exportCount > 0
      ? `<p>${escapeDailyReportHtml(input.attachedMessage)}</p>`
      : `<p>${escapeDailyReportHtml(input.emptyMessage)}</p>`;
  const incompleteSection =
    input.incomplete.length > 0
      ? `
        <p><strong>Eksik kayıtlar;</strong></p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <thead>
            <tr>
              <th align="left">Rezervasyon</th>
              <th align="left">Misafir</th>
              <th align="left">Villa</th>
              <th align="left">Eksik</th>
            </tr>
          </thead>
          <tbody>
            ${input.incomplete
              .map(
                (row) => `
              <tr>
                <td>${escapeDailyReportHtml(row.externalCode)}</td>
                <td>${escapeDailyReportHtml(row.guestName)}</td>
                <td>${escapeDailyReportHtml(row.villaName)}</td>
                <td>${escapeDailyReportHtml(row.missing.join(", "))}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `
      : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <p><strong>Bilgilendirme</strong></p>
      <p>${escapeDailyReportHtml(input.title)}<br>
      Giriş tarihi: <strong>${escapeDailyReportHtml(checkInLabel)}</strong>
      (giriş gününden 1 gün sonra, onaylı rezervasyonlar)</p>
      <p>Onaylı rezervasyon: <strong>${input.matchedCount}</strong><br>
      Excel'e alınan kayıt: <strong>${input.exportCount}</strong></p>
      ${paidLine}
      ${incompleteLine}
      ${resultLine}
      ${incompleteSection}
      <p>Bilgilerinize<br><strong>BONT</strong></p>
    </div>
  `;
}
