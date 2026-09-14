import type { Attachment } from "nodemailer/lib/mailer";
import { getIstanbulDateKey } from "@/lib/booking-calendar-days";
import {
  BTRANS_DATE_BASIS_OPTIONS,
  type BtransDateBasis,
} from "@/lib/btrans-report";
import {
  BTRANS_EXCEL_MIME,
  BTRANS_MONTHLY_EMAIL_SUBJECT,
  BTRANS_MONTHLY_REPORT_EMAIL,
  BTRANS_XML_MIME,
  buildBtransIncompleteExcelBuffer,
  buildBtransMonthlyReportHtml,
  buildBtransMonthlyReportText,
  formatBtransPeriodLabel,
  type BtransMonthlyMailSummary,
} from "@/lib/btrans-monthly-report-mail";
import { sendCompanyMail } from "@/lib/email";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { generateBtransReport } from "@/lib/queries/btrans-report";

const DEFAULT_DATE_BASIS: BtransDateBasis = "approvedAt";

export type BtransMonthlyReportResult = {
  ok: boolean;
  year: number;
  month: number;
  dateBasis: BtransDateBasis;
  count: number;
  incompleteCount: number;
  emailSent: boolean;
  attachedXml: boolean;
  attachedExcel: boolean;
  error?: string;
  message?: string;
  test?: boolean;
};

/** Türkiye takvimine göre bir önceki ay (yıl + ay). */
export function getPreviousMonthIstanbul(now = new Date()): {
  year: number;
  month: number;
} {
  const key = getIstanbulDateKey(now);
  const [yearPart, monthPart] = key.split("-").map(Number);
  const year = yearPart ?? now.getFullYear();
  const month = monthPart ?? now.getMonth() + 1;
  if (month <= 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

function dateBasisLabel(dateBasis: BtransDateBasis): string {
  return (
    BTRANS_DATE_BASIS_OPTIONS.find((option) => option.value === dateBasis)
      ?.label ?? dateBasis
  );
}

export async function runBtransMonthlyReport(options?: {
  year?: number;
  month?: number;
  dateBasis?: BtransDateBasis;
  test?: boolean;
  now?: Date;
}): Promise<BtransMonthlyReportResult> {
  const previous = getPreviousMonthIstanbul(options?.now);
  const year = options?.year ?? previous.year;
  const month = options?.month ?? previous.month;
  const dateBasis = options?.dateBasis ?? DEFAULT_DATE_BASIS;
  const test = Boolean(options?.test);

  const report = await generateBtransReport({ year, month, dateBasis });
  const summary: BtransMonthlyMailSummary = {
    year,
    month,
    dateBasisLabel: dateBasisLabel(dateBasis),
    count: report.count,
    incompleteCount: report.incompleteCount,
    incomplete: report.incomplete,
    warnings: report.warnings,
    error: report.error,
    test,
  };

  const period = formatBtransPeriodLabel(year, month);
  const subject = test
    ? `${BTRANS_MONTHLY_EMAIL_SUBJECT} — ${period} — TEST`
    : `${BTRANS_MONTHLY_EMAIL_SUBJECT} — ${period}`;

  const attachments: Attachment[] = [];
  if (report.xml && !report.error) {
    attachments.push({
      filename: report.filename,
      content: Buffer.from(report.xml, "utf8"),
      contentType: BTRANS_XML_MIME,
    });
  }
  if (report.incomplete.length > 0) {
    const excelName = `btrans-eksik-${year}-${String(month).padStart(2, "0")}.xlsx`;
    attachments.push({
      filename: excelName,
      content: buildBtransIncompleteExcelBuffer(report.incomplete),
      contentType: BTRANS_EXCEL_MIME,
    });
  }

  let emailSent = false;
  try {
    const company = await getCompanySettings();
    await sendCompanyMail(company, {
      to: BTRANS_MONTHLY_REPORT_EMAIL,
      subject,
      text: buildBtransMonthlyReportText(summary),
      html: buildBtransMonthlyReportHtml(summary),
      bcc: "",
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    emailSent = true;
  } catch (error) {
    console.error("[btrans-monthly-report] e-posta", error);
  }

  return {
    ok: emailSent,
    year,
    month,
    dateBasis,
    count: report.count,
    incompleteCount: report.incompleteCount,
    emailSent,
    attachedXml: Boolean(report.xml && !report.error && emailSent),
    attachedExcel: report.incomplete.length > 0 && emailSent,
    error: report.error,
    message: emailSent
      ? undefined
      : "BTRANS aylık rapor e-postası gönderilemedi",
    test,
  };
}
