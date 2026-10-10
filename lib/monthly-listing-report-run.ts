import type { Attachment } from "nodemailer/lib/mailer";
import { getPreviousMonthIstanbul } from "@/lib/btrans-monthly-report";
import { sendCompanyMail } from "@/lib/email";
import {
  MONTHLY_LISTING_EMAIL_SUBJECT,
  MONTHLY_LISTING_EXCEL_MIME,
  MONTHLY_LISTING_FROM_EMAIL,
  MONTHLY_LISTING_REPORT_EMAIL,
  buildMonthlyListingExcelBuffer,
  buildMonthlyListingReportHtml,
  buildMonthlyListingReportText,
  monthlyListingAttachmentName,
} from "@/lib/monthly-listing-report-mail";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getMonthlyListingReportData } from "@/lib/queries/monthly-listing-report";

function isTatilVillacisiDomain(domain: string) {
  const host = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  return host === "tatilvillacisi.com" || host.startsWith("tatilvillacisi.com/");
}

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
  const sites = await getAgencySitesForPicker();
  const siteIds = sites
    .filter((site) => isTatilVillacisiDomain(site.domain))
    .map((site) => site.id);
  if (siteIds.length === 0) {
    return {
      ok: false,
      year,
      month,
      count: 0,
      emailSent: false,
      message: "tatilvillacisi.com sitesi bulunamadı",
      test,
    };
  }

  const report = await getMonthlyListingReportData(year, month, siteIds);
  const attachments: Attachment[] = [];
  if (report.rows.length > 0) {
    attachments.push({
      filename: monthlyListingAttachmentName(year, month),
      content: buildMonthlyListingExcelBuffer(report.rows),
      contentType: MONTHLY_LISTING_EXCEL_MIME,
    });
  }

  let emailSent = false;
  let sendError = "";
  try {
    const company = await getCompanySettings();
    await sendCompanyMail(company, {
      to: MONTHLY_LISTING_REPORT_EMAIL,
      fromEmail: MONTHLY_LISTING_FROM_EMAIL,
      subject: MONTHLY_LISTING_EMAIL_SUBJECT,
      text: buildMonthlyListingReportText(),
      html: buildMonthlyListingReportHtml(),
      bcc: "",
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    emailSent = true;
  } catch (error) {
    sendError = error instanceof Error ? error.message : "E-posta gönderilemedi";
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
      : sendError || "Aylık ilan raporu e-postası gönderilemedi",
    test,
  };
}
