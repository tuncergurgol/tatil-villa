import { sendCompanyMail } from "@/lib/email";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { sendOperationsWhatsApp } from "@/lib/whatsapp-delivery";

export const INTEGRATION_LEAD_NOTIFY_EMAIL =
  process.env.CALLBACK_NOTIFY_EMAIL?.trim() || "info@tatildeyiz.com.tr";

/** Evolution WhatsApp (905436124151) → operasyon hattı */
export const INTEGRATION_LEAD_NOTIFY_WHATSAPP =
  process.env.CALLBACK_NOTIFY_WHATSAPP?.trim() || "+902526180108";

export type IntegrationLeadKind = "callback" | "yolcu360" | "obilet";

export type IntegrationLeadNotifyInput = {
  kind: IntegrationLeadKind;
  subject: string;
  message: string;
};

function messageToHtml(message: string) {
  return message
    .split("\n")
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("");
}

export async function notifyIntegrationLead(
  input: IntegrationLeadNotifyInput
): Promise<void> {
  const company = await getCompanySettings();

  await Promise.all([
    sendCompanyMail(company, {
      to: INTEGRATION_LEAD_NOTIFY_EMAIL,
      subject: input.subject,
      text: input.message,
      html: messageToHtml(input.message),
    }).catch((error) => {
      console.error(`[integration-lead-notify:${input.kind}] e-posta`, error);
    }),
    sendOperationsWhatsApp(INTEGRATION_LEAD_NOTIFY_WHATSAPP, input.message).then(
      (result) => {
        if (!result.ok) {
          console.error(
            `[integration-lead-notify:${input.kind}] WhatsApp`,
            result.error
          );
        }
      }
    ),
  ]);
}
