import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const WHATSAPP_CALENDAR_LINK_NOTIFY_EMAIL = "info@tatildeyiz.com.tr";

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'\]\)]+/gi;

function stripTrailingPunctuation(value: string) {
  return value.replace(/[.,;:!?]+$/g, "");
}

function toAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function extractWhatsappMessageUrls(
  ...parts: Array<string | null | undefined>
): string[] {
  const found = new Set<string>();
  for (const part of parts) {
    if (!part?.trim()) continue;
    const matches = part.match(URL_PATTERN) ?? [];
    for (const raw of matches) {
      const cleaned = stripTrailingPunctuation(raw.trim());
      if (cleaned.length < 8) continue;
      found.add(toAbsoluteUrl(cleaned));
    }
  }
  return [...found];
}

export type WhatsappCalendarLinkNotifyInput = {
  groupName: string;
  groupExternalId: string;
  villaNames: string[];
  senderName: string;
  senderPhone: string;
  body: string;
  quotedBody?: string;
  urls: string[];
};

export function buildWhatsappCalendarLinkNotifySubject(
  input: Pick<WhatsappCalendarLinkNotifyInput, "villaNames" | "groupName">
) {
  const villa = input.villaNames[0]?.trim();
  if (villa) return `Takvim WhatsApp — ${villa} — mesajda link`;
  const group = input.groupName.trim();
  if (group) return `Takvim WhatsApp — ${group} — mesajda link`;
  return "Takvim WhatsApp — mesajda link";
}

export function buildWhatsappCalendarLinkNotifyText(
  input: WhatsappCalendarLinkNotifyInput
) {
  const sender =
    [input.senderName.trim(), input.senderPhone.trim()]
      .filter(Boolean)
      .join(" · ") || "—";
  const villas = input.villaNames.filter(Boolean).join(", ") || "—";
  const group = input.groupName.trim() || input.groupExternalId || "—";

  const lines = [
    "Takvim WhatsApp grubuna link içeren bir mesaj geldi.",
    "",
    `Grup: ${group}`,
    `Villa: ${villas}`,
    `Gönderen: ${sender}`,
    "",
    "Linkler:",
    ...input.urls.map((url) => `- ${url}`),
    "",
    "Mesaj:",
    input.body.trim() || "—",
  ];

  if (input.quotedBody?.trim()) {
    lines.push("", "Alıntı:", input.quotedBody.trim());
  }

  return lines.join("\n");
}

export async function notifyWhatsappCalendarMessageHasLinks(
  input: WhatsappCalendarLinkNotifyInput
): Promise<boolean> {
  if (input.urls.length === 0) return false;

  try {
    const company = await getCompanySettings();
    const to =
      company.email?.trim() || WHATSAPP_CALENDAR_LINK_NOTIFY_EMAIL;
    const text = buildWhatsappCalendarLinkNotifyText(input);
    await sendCompanyMail(company, {
      to,
      subject: buildWhatsappCalendarLinkNotifySubject(input),
      text,
      html: toHtmlFromText(text),
    });
    return true;
  } catch (error) {
    console.error("[whatsapp-calendar-link-notify] e-posta", error);
    return false;
  }
}
