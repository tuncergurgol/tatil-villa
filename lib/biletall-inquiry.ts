import { BILETALL_RESERVED_IFRAME_QUERY_KEYS } from "@/lib/biletall-callbacks";
import { notifyIntegrationLead } from "@/lib/integration-lead-notify";

const PNR_KEYS = ["PNR", "pnr", "Pnr", "PnrNo", "pnrNo"];

export function buildBiletallInquirySummary(
  searchParams: Record<string, string>
) {
  const pnr =
    PNR_KEYS.map((key) => searchParams[key]?.trim()).find(Boolean) ?? "";

  const lines: string[] = [];
  for (const [key, value] of Object.entries(searchParams)) {
    if (!value?.trim()) continue;
    if (BILETALL_RESERVED_IFRAME_QUERY_KEYS.has(key)) continue;
    lines.push(`${key}: ${value.trim()}`);
  }

  return {
    pnr,
    summary: lines.join("\n") || "Obilet bilet işlemi tamamlandı",
  };
}

export function serializeBiletallQuery(
  searchParams: Record<string, string>
): string {
  return new URLSearchParams(searchParams).toString();
}

type BiletallInquiryNotifyRow = {
  pnr: string;
  summary: string;
  sourceSite: string;
  sourceDomain: string;
};

function formatSiteLabel(sourceSite: string, sourceDomain: string) {
  const site = sourceSite.trim();
  const domain = sourceDomain.trim();
  if (site && domain) return `${site} (${domain})`;
  return site || domain || "Bilinmiyor";
}

export function buildBiletallInquiryLeadMessage(row: BiletallInquiryNotifyRow) {
  const siteLabel = formatSiteLabel(row.sourceSite, row.sourceDomain);
  return [
    "Obilet — yeni bilet işlemi",
    "",
    `Site: ${siteLabel}`,
    row.pnr ? `PNR: ${row.pnr}` : null,
    "",
    row.summary.trim() || "—",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export async function notifyBiletallInquiryLead(row: BiletallInquiryNotifyRow) {
  const message = buildBiletallInquiryLeadMessage(row);
  await notifyIntegrationLead({
    kind: "obilet",
    subject: `Obilet — ${row.pnr || "yeni işlem"}`,
    message,
  });
}
