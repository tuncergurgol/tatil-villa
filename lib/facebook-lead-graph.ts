import { createHmac, timingSafeEqual } from "node:crypto";

type GraphLeadField = {
  name: string;
  values: string[];
};

export type GraphLeadResponse = {
  id: string;
  created_time?: string;
  field_data?: GraphLeadField[];
};

export type FacebookLeadgenWebhookValue = {
  ad_id?: string;
  form_id?: string;
  leadgen_id: string;
  created_time?: number;
  page_id?: string;
  adgroup_id?: string;
};

export function verifyFacebookWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret.trim()) return false;
  const expected = `sha256=${createHmac("sha256", appSecret.trim())
    .update(rawBody, "utf8")
    .digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export function extractLeadField(
  fieldData: GraphLeadField[] | undefined,
  names: string[]
): string {
  if (!fieldData?.length) return "";
  const normalized = names.map((n) => n.toLowerCase());
  for (const field of fieldData) {
    const key = field.name?.toLowerCase() ?? "";
    if (normalized.includes(key)) {
      return field.values?.[0]?.trim() ?? "";
    }
  }
  return "";
}

export function buildCustomFieldsJson(
  fieldData: GraphLeadField[] | undefined
): Record<string, string> | null {
  if (!fieldData?.length) return null;
  const out: Record<string, string> = {};
  for (const field of fieldData) {
    const key = field.name?.trim();
    const value = field.values?.join(", ").trim() ?? "";
    if (key && value) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

export async function fetchFacebookLeadFromGraph(input: {
  leadgenId: string;
  pageAccessToken: string;
  apiVersion?: string;
}): Promise<GraphLeadResponse> {
  const version = input.apiVersion?.trim() || "v22.0";
  const url = new URL(
    `https://graph.facebook.com/${version}/${encodeURIComponent(input.leadgenId)}`
  );
  url.searchParams.set(
    "access_token",
    input.pageAccessToken.trim()
  );
  url.searchParams.set("fields", "id,created_time,field_data");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Facebook Graph lead fetch failed (${response.status}): ${body.slice(0, 300)}`
    );
  }

  return (await response.json()) as GraphLeadResponse;
}
