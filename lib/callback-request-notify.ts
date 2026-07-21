import type {
  CallbackPreferredDay,
  CallbackPreferredTime,
} from "@prisma/client";
import {
  CALLBACK_DAY_LABELS,
  CALLBACK_TIME_LABELS,
} from "@/lib/callback-request-labels";
import { sendCompanyMail } from "@/lib/email";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { sendOperationsWhatsApp } from "@/lib/whatsapp-delivery";

const NOTIFY_EMAIL =
  process.env.CALLBACK_NOTIFY_EMAIL?.trim() || "info@tatildeyiz.com.tr";
const NOTIFY_WHATSAPP =
  process.env.CALLBACK_NOTIFY_WHATSAPP?.trim() || "+902526180108";

export type CallbackRequestNotifyInput = {
  name: string;
  phone: string;
  note: string;
  preferredDay: CallbackPreferredDay;
  preferredTime: CallbackPreferredTime;
  sourceSite: string;
  sourceDomain: string;
};

function formatSiteLabel(sourceSite: string, sourceDomain: string): string {
  const site = sourceSite.trim();
  const domain = sourceDomain.trim();
  if (site && domain) return `${site} (${domain})`;
  return site || domain || "Bilinmiyor";
}

function buildCallbackRequestMessage(input: CallbackRequestNotifyInput): string {
  const siteLabel = formatSiteLabel(input.sourceSite, input.sourceDomain);
  const day = CALLBACK_DAY_LABELS[input.preferredDay];
  const time = CALLBACK_TIME_LABELS[input.preferredTime];

  return [
    "Yeni Sizi Arayalım talebi",
    "",
    `Site: ${siteLabel}`,
    `Ad: ${input.name}`,
    `Telefon: ${input.phone}`,
    `Gün: ${day}`,
    `Saat: ${time}`,
    `Plan / Not: ${input.note.trim() || "—"}`,
  ].join("\n");
}

/** Yeni kayıt: info e-postası + Takvim WhatsApp (Evolution) bildirimi */
export async function notifyNewCallbackRequest(
  input: CallbackRequestNotifyInput
): Promise<void> {
  const message = buildCallbackRequestMessage(input);
  const siteLabel = formatSiteLabel(input.sourceSite, input.sourceDomain);

  const company = await getCompanySettings();

  const tasks: Promise<unknown>[] = [
    sendCompanyMail(company, {
      to: NOTIFY_EMAIL,
      subject: `Sizi Arayalım — ${input.name} (${siteLabel})`,
      text: message,
      html: message
        .split("\n")
        .map((line) => `<p>${line || "&nbsp;"}</p>`)
        .join(""),
    }).catch((error) => {
      console.error("[callback-request-notify] e-posta hatası", error);
    }),
    sendOperationsWhatsApp(NOTIFY_WHATSAPP, message).then((result) => {
      if (!result.ok) {
        console.error(
          "[callback-request-notify] Takvim WhatsApp hatası",
          result.error
        );
      }
    }),
  ];

  await Promise.all(tasks);
}
