import { sendCompanyMail } from "@/lib/email";
import {
  getIstanbulDateKey,
  getYesterdayIstanbulDateKey,
} from "@/lib/booking-calendar-days";
import {
  buildDailyInvoiceReportText,
  buildDailyOwnerPaymentReportText,
  buildDailyReportHtml,
  DAILY_CHECK_IN_REPORT_EMAIL,
  DAILY_REPORT_EXCEL_MIME,
  INVOICE_DAILY_EMAIL_SUBJECT,
  OWNER_PAYMENT_DAILY_EMAIL_SUBJECT,
  workbookBufferFromRows,
  type DailyReportMailSummary,
} from "@/lib/daily-check-in-report-mail";
import {
  generateInvoiceReportForCheckInDate,
  type InvoiceReportIncompleteRow,
} from "@/lib/queries/invoice-report";
import {
  generateOwnerPaymentReportForCheckInDate,
  type OwnerPaymentIncompleteRow,
} from "@/lib/queries/owner-payment-report";
import { getCompanySettings } from "@/lib/queries/company-settings";

export type DailyReportMailKind = "invoice" | "ownerPayment";

export type DailyReportMailResult = {
  kind: DailyReportMailKind;
  checkInDateKey: string;
  matchedCount: number;
  exportCount: number;
  incompleteCount: number;
  paidCount?: number;
  overdueCount?: number;
  emailSent: boolean;
  attached: boolean;
  message?: string;
};

export type DailyCheckInReportsResult = {
  ok: boolean;
  checkInDateKey: string;
  invoice: DailyReportMailResult;
  ownerPayment: DailyReportMailResult;
};

function mapInvoiceIncomplete(
  rows: InvoiceReportIncompleteRow[]
): DailyReportMailSummary["incomplete"] {
  return rows.map((row) => ({
    externalCode: row.externalCode,
    guestName: row.guestName,
    villaName: row.villaName,
    missing: row.missing,
  }));
}

function mapOwnerIncomplete(
  rows: OwnerPaymentIncompleteRow[]
): DailyReportMailSummary["incomplete"] {
  return rows.map((row) => ({
    externalCode: row.externalCode,
    guestName: row.guestName,
    villaName: row.villaName,
    missing: row.missing,
  }));
}

async function sendDailyReportMail(input: {
  subject: string;
  text: string;
  html: string;
  filename?: string;
  rows?: (string | number)[][];
  attach: boolean;
}) {
  const company = await getCompanySettings();
  await sendCompanyMail(company, {
    to: DAILY_CHECK_IN_REPORT_EMAIL,
    subject: input.subject,
    text: input.text,
    html: input.html,
    bcc: "",
    attachments:
      input.attach && input.filename && input.rows
        ? [
            {
              filename: input.filename,
              content: workbookBufferFromRows(input.rows),
              contentType: DAILY_REPORT_EXCEL_MIME,
            },
          ]
        : undefined,
  });
}

async function sendInvoiceDailyMail(
  checkInDateKey: string
): Promise<DailyReportMailResult> {
  const report = await generateInvoiceReportForCheckInDate(checkInDateKey);
  const summary: DailyReportMailSummary = {
    checkInDateKey,
    matchedCount: report.matchedCount,
    exportCount: report.count,
    incompleteCount: report.incompleteCount,
    incomplete: mapInvoiceIncomplete(report.incomplete),
  };
  const attach = report.count > 0;
  const text = buildDailyInvoiceReportText(summary);
  const html = buildDailyReportHtml({
    title: "Konaklama faturaları günlük kontrolü",
    checkInDateKey,
    matchedCount: summary.matchedCount,
    exportCount: summary.exportCount,
    incompleteCount: summary.incompleteCount,
    emptyMessage: "Bugün gönderilecek konaklama faturası bulunmamaktadır.",
    attachedMessage: "Konaklama faturaları Excel ektedir.",
    incomplete: summary.incomplete,
  });

  let emailSent = false;
  try {
    await sendDailyReportMail({
      subject: INVOICE_DAILY_EMAIL_SUBJECT,
      text,
      html,
      filename: report.filename,
      rows: report.rows,
      attach,
    });
    emailSent = true;
  } catch (error) {
    console.error("[daily-check-in-reports] konaklama faturası e-posta", error);
  }

  return {
    kind: "invoice",
    checkInDateKey,
    matchedCount: summary.matchedCount,
    exportCount: summary.exportCount,
    incompleteCount: summary.incompleteCount,
    emailSent,
    attached: attach && emailSent,
    message: emailSent
      ? undefined
      : "Konaklama faturaları e-postası gönderilemedi",
  };
}

export async function sendOwnerPaymentDailyMail(
  checkInDateKey: string,
  options?: { test?: boolean; overdueBeforeDateKey?: string }
): Promise<DailyReportMailResult> {
  const report = await generateOwnerPaymentReportForCheckInDate(
    checkInDateKey,
    options?.overdueBeforeDateKey ?? getIstanbulDateKey()
  );
  const summary: DailyReportMailSummary = {
    checkInDateKey,
    matchedCount: report.matchedCount,
    exportCount: report.count,
    incompleteCount: report.incompleteCount,
    paidCount: report.paidCount,
    overdueCount: report.overdueCount,
    incomplete: mapOwnerIncomplete(report.incomplete),
  };
  const attach = report.count > 0;
  const text = buildDailyOwnerPaymentReportText(summary);
  const html = buildDailyReportHtml({
    title: options?.test
      ? "Ev sahibi ödemeleri günlük kontrolü — TEST"
      : "Ev sahibi ödemeleri günlük kontrolü",
    checkInDateKey,
    matchedCount: summary.matchedCount,
    exportCount: summary.exportCount,
    incompleteCount: summary.incompleteCount,
    paidCount: summary.paidCount,
    overdueCount: summary.overdueCount,
    emptyMessage: "Bugün gönderilecek ev sahibi ödemesi bulunmamaktadır.",
    attachedMessage: "Ev sahibi ödemeleri Excel ektedir.",
    incomplete: summary.incomplete,
  });

  let emailSent = false;
  try {
    await sendDailyReportMail({
      subject: options?.test
        ? `${OWNER_PAYMENT_DAILY_EMAIL_SUBJECT} — TEST`
        : OWNER_PAYMENT_DAILY_EMAIL_SUBJECT,
      text,
      html,
      filename: report.filename,
      rows: report.rows,
      attach,
    });
    emailSent = true;
  } catch (error) {
    console.error("[daily-check-in-reports] ev sahibi ödemesi e-posta", error);
  }

  return {
    kind: "ownerPayment",
    checkInDateKey,
    matchedCount: summary.matchedCount,
    exportCount: summary.exportCount,
    incompleteCount: summary.incompleteCount,
    paidCount: summary.paidCount,
    overdueCount: summary.overdueCount,
    emailSent,
    attached: attach && emailSent,
    message: emailSent
      ? undefined
      : "Ev sahibi ödemeleri e-postası gönderilemedi",
  };
}

export async function runDailyCheckInReports(
  now = new Date()
): Promise<DailyCheckInReportsResult> {
  const checkInDateKey = getYesterdayIstanbulDateKey(now);
  const invoice = await sendInvoiceDailyMail(checkInDateKey);
  const ownerPayment = await sendOwnerPaymentDailyMail(checkInDateKey, {
    overdueBeforeDateKey: getIstanbulDateKey(now),
  });

  return {
    ok: invoice.emailSent && ownerPayment.emailSent,
    checkInDateKey,
    invoice,
    ownerPayment,
  };
}
