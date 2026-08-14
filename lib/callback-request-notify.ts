import type {
  CallbackPreferredDay,
  CallbackPreferredTime,
} from "@prisma/client";
import {
  CALLBACK_DAY_LABELS,
  CALLBACK_TIME_LABELS,
} from "@/lib/callback-request-labels";
import { notifyIntegrationLead } from "@/lib/integration-lead-notify";

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

/** Yeni kayıt: info@tatildeyiz.com.tr + Evolution WhatsApp (→ +902526180108) */
export async function notifyNewCallbackRequest(
  input: CallbackRequestNotifyInput
): Promise<void> {
  const message = buildCallbackRequestMessage(input);
  const siteLabel = formatSiteLabel(input.sourceSite, input.sourceDomain);

  await notifyIntegrationLead({
    kind: "callback",
    subject: `Sizi Arayalım — ${input.name} (${siteLabel})`,
    message,
  });
}
