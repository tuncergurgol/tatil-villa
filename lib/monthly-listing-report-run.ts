import type { Attachment } from "nodemailer/lib/mailer";
import { getPreviousMonthIstanbul } from "@/lib/btrans-monthly-report";
import { sendCompanyMail } from "@/lib/email";
import {
  MONTHLY_LISTING_EMAIL_SUBJECT,
  MONTHLY_LISTING_EXCEL_MIME,
  MONTHLY_LISTING_REPORT_EMAIL,
  buildMonthlyListingExcelBuffer,
  buildMonthlyListingReportHtml,
  buildMonthlyListingReportText,
  formatMonthlyListingPeriodLabel,
} from "@/lib/monthly-listing-report-mail";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getMonthlyListingReportData } from "@/lib/queries/monthly-listing-report";

export type MonthlyListingReportRunResult = {
  ok: boolean;
  year: number;
  month: number;
  count: number;
  emailSent: boolean;
  message?: string;
  test?: boolean;
};

export async function runMonthlyListingReport(options?: {
  year?: number;
  month?: number;
  test?: boolean;
  now?: Date;
}): Promise<MonthlyListingReportRunResult> {
  const previous = getPreviousMonthIstanbul(options?.now);
  const year = options?.year ?? previous.year;
  const month = options?.month ?? previous.month;
  const test = Boolean(options?.test);
  const report = await getMonthlyListingReportData(year, month);
  const period = formatMonthlyListingPeriodLabel(year, month);
  const subject = test
    ? `${MONTHLY_LISTING_EMAIL_SUBJECT} — ${period} — TEST`
    : `${MONTHLY_LISTING_EMAIL_SUBJECT} — ${period}`;
  const summary = {
    year,
    month,
    listingDateRange: report.listingDateRange,
    count: report.rows.length,
    test,
  };

  const attachments: Attachment[] = [];
  if (report.rows.length > 0) {
    attachments.push({
      filename: `aylik-ilan-raporu-${year}-${String(month).padStart(2, "0")}.xlsx`,
      content: buildMonthlyListingExcelBuffer(report.rows),
      contentType: MONTHLY_LISTING_EXCEL_MIME,
    });
  }

  let emailSent = false;
  try {
    const company = await getCompanySettings();
    await sendCompanyMail(company, {
      to: MONTHLY_LISTING_REPORT_EMAIL,
      subject,
      text: buildMonthlyListingReportText(summary),
      html: buildMonthlyListingReportHtml(summary),
      bcc: "",
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    emailSent = true;
  } catch (error) {
    console.error("[monthly-listing-report] e-posta", error);
  }

  return {
    ok: emailSent,
    year,
    month,
    count: report.rows.length,
    emailSent,
    message: emailSent
      ? undefined
      : "Aylık ilan raporu e-postası gönderilemedi",
    test,
  };
}
