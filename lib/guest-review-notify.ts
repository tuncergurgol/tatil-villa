import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { getAdminPanelBaseUrl } from "@/lib/admin-auth-url";
import { pendingGuestReviewsAdminHref } from "@/lib/guest-review-admin-url";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const GUEST_REVIEW_NOTIFY_EMAIL = "info@tatildeyiz.com.tr";

export type GuestReviewSubmittedNotifyInput = {
  guestName: string;
  villaName: string;
  rating: number;
  title: string;
  comment: string;
  stayMonth: string;
};

function stars(rating: number) {
  const safe = Math.min(5, Math.max(1, rating));
  return `${"★".repeat(safe)}${"☆".repeat(5 - safe)} (${safe}/5)`;
}

export function buildGuestReviewNotifyText(
  input: GuestReviewSubmittedNotifyInput,
  adminUrl: string
) {
  const lines = [
    "Yeni bir misafir yorumu onay bekliyor.",
    "",
    `Villa: ${input.villaName || "—"}`,
    `Misafir: ${input.guestName || "—"}`,
    `Puan: ${stars(input.rating)}`,
  ];
  if (input.stayMonth.trim()) {
    lines.push(`Konaklama: ${input.stayMonth.trim()}`);
  }
  if (input.title.trim()) {
    lines.push(`Başlık: ${input.title.trim()}`);
  }
  lines.push("", "Yorum:", input.comment.trim(), "", `Onay listesi: ${adminUrl}`);
  return lines.join("\n");
}

export async function notifyGuestReviewSubmitted(
  input: GuestReviewSubmittedNotifyInput
): Promise<void> {
  const adminUrl = `${getAdminPanelBaseUrl()}${pendingGuestReviewsAdminHref()}`;
  const text = buildGuestReviewNotifyText(input, adminUrl);

  try {
    const company = await getCompanySettings();
    await sendCompanyMail(company, {
      to: GUEST_REVIEW_NOTIFY_EMAIL,
      subject: `Onay bekleyen misafir yorumu — ${input.villaName || "Villa"}`,
      text,
      html: toHtmlFromText(text),
    });
  } catch (error) {
    console.error("[guest-review-notify] e-posta", error);
  }
}
