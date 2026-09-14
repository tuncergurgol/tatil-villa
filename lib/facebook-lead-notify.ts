import type { FacebookLead } from "@prisma/client";
import { notifyIntegrationLead } from "@/lib/integration-lead-notify";

function formatLeadMessage(lead: FacebookLead): string {
  const lines = [
    "Yeni Facebook Lead",
    lead.fullName ? `Ad: ${lead.fullName}` : null,
    lead.phone ? `Tel: ${lead.phone}` : null,
    lead.email ? `E-posta: ${lead.email}` : null,
    lead.formName ? `Form: ${lead.formName}` : lead.formId ? `Form ID: ${lead.formId}` : null,
    lead.campaignName ? `Kampanya: ${lead.campaignName}` : null,
    lead.isTest ? "(Test lead)" : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function notifyFacebookLead(lead: FacebookLead): Promise<void> {
  const name = lead.fullName?.trim() || lead.phone?.trim() || "Facebook Lead";
  await notifyIntegrationLead({
    kind: "facebook",
    subject: `Facebook Lead: ${name}`,
    message: formatLeadMessage(lead),
  });
}
