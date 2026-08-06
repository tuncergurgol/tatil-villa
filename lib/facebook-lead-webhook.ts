import { prisma } from "@/lib/db";
import {
  buildCustomFieldsJson,
  extractLeadField,
  fetchFacebookLeadFromGraph,
  type FacebookLeadgenWebhookValue,
  type GraphLeadResponse,
} from "@/lib/facebook-lead-graph";
import { notifyFacebookLead } from "@/lib/facebook-lead-notify";
import { getCompanySettings } from "@/lib/queries/company-settings";

function mapGraphLeadToFields(graph: GraphLeadResponse) {
  const fieldData = graph.field_data;
  return {
    fullName:
      extractLeadField(fieldData, [
        "full_name",
        "name",
        "ad_soyad",
        "ad_soyadı",
      ]) || "",
    email: extractLeadField(fieldData, ["email", "e-posta", "eposta"]) || "",
    phone:
      extractLeadField(fieldData, [
        "phone_number",
        "phone",
        "telefon",
        "mobile_phone",
      ]) || "",
    customFieldsJson: buildCustomFieldsJson(fieldData),
  };
}

export async function upsertFacebookLeadFromGraph(input: {
  externalLeadId: string;
  graph: GraphLeadResponse;
  meta?: Partial<FacebookLeadgenWebhookValue>;
  isTest?: boolean;
}) {
  const mapped = mapGraphLeadToFields(input.graph);

  const lead = await prisma.facebookLead.upsert({
    where: { externalLeadId: input.externalLeadId },
    create: {
      externalLeadId: input.externalLeadId,
      formId: input.meta?.form_id ?? "",
      pageId: input.meta?.page_id ?? "",
      adId: input.meta?.ad_id ?? "",
      campaignId: input.meta?.adgroup_id ?? "",
      fullName: mapped.fullName,
      email: mapped.email,
      phone: mapped.phone,
      customFieldsJson: mapped.customFieldsJson ?? undefined,
      isTest: input.isTest ?? false,
    },
    update: {
      formId: input.meta?.form_id ?? undefined,
      pageId: input.meta?.page_id ?? undefined,
      adId: input.meta?.ad_id ?? undefined,
      campaignId: input.meta?.adgroup_id ?? undefined,
      fullName: mapped.fullName || undefined,
      email: mapped.email || undefined,
      phone: mapped.phone || undefined,
      customFieldsJson: mapped.customFieldsJson ?? undefined,
    },
  });

  return lead;
}

export async function processFacebookLeadgenWebhookValue(
  value: FacebookLeadgenWebhookValue
) {
  const settings = await getCompanySettings();
  if (!settings.facebookLeadEnabled) {
    return { ok: false, message: "Facebook Lead entegrasyonu kapalı" };
  }

  const token = settings.facebookLeadPageAccessToken?.trim();
  if (!token) {
    return { ok: false, message: "Page access token tanımlı değil" };
  }

  const leadgenId = value.leadgen_id?.trim();
  if (!leadgenId) {
    return { ok: false, message: "leadgen_id eksik" };
  }

  const graph = await fetchFacebookLeadFromGraph({
    leadgenId,
    pageAccessToken: token,
    apiVersion: settings.whatsappApiVersion || "v22.0",
  });

  const existing = await prisma.facebookLead.findUnique({
    where: { externalLeadId: leadgenId },
    select: { id: true },
  });

  const lead = await upsertFacebookLeadFromGraph({
    externalLeadId: leadgenId,
    graph,
    meta: value,
  });

  if (!existing) {
    await notifyFacebookLead(lead);
  }

  return { ok: true, leadId: lead.id, created: !existing };
}

export async function processFacebookLeadWebhookPayload(payload: unknown) {
  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as { object?: string }).object !== "page"
  ) {
    return { ok: false, message: "Geçersiz webhook payload" };
  }

  const entry = (payload as { entry?: unknown[] }).entry;
  if (!Array.isArray(entry) || entry.length === 0) {
    return { ok: true, processed: 0 };
  }

  let processed = 0;
  const results: Array<{ ok: boolean; message?: string; leadId?: string }> =
    [];

  for (const item of entry) {
    const changes = (item as { changes?: unknown[] }).changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const field = (change as { field?: string }).field;
      if (field !== "leadgen") continue;
      const value = (change as { value?: FacebookLeadgenWebhookValue }).value;
      if (!value?.leadgen_id) continue;

      const result = await processFacebookLeadgenWebhookValue(value);
      results.push(result);
      if (result.ok) processed += 1;
    }
  }

  if (processed === 0 && results.length === 0) {
    return { ok: true, processed: 0, message: "leadgen olayı yok" };
  }

  const failed = results.find((r) => !r.ok);
  if (failed && processed === 0) {
    return { ok: false, message: failed.message ?? "İşlenemedi" };
  }

  return { ok: true, processed, results };
}
