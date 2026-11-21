export function buildVillaIcalExportUrl(
  siteOrigin: string,
  villaId: string,
  token: string
) {
  const origin = siteOrigin.replace(/\/$/, "");
  return `${origin}/api/ics/${villaId}/${token}.ics`;
}

export function resolveSiteOrigin(input: {
  host?: string | null;
  protocol?: string | null;
  companyDomain?: string | null;
}) {
  if (input.host) {
    const protocol = input.protocol ?? "https";
    return `${protocol}://${input.host}`;
  }

  const domain = (input.companyDomain ?? "www.tatildeyiz.com.tr")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return `https://${domain}`;
}
