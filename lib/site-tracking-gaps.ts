export const SITE_TRACKING_GAP_FIELDS = [
  {
    key: "googleAnalyticsId",
    label: "Google Analytics ID",
    placeholder: "G-XXXXXXXXXX",
  },
  {
    key: "googleTagManagerId",
    label: "Google Tag Manager ID",
    placeholder: "GTM-XXXXXXX",
  },
  {
    key: "googleAdsId",
    label: "Google Ads ID",
    placeholder: "AW-XXXXXXXXX",
  },
  {
    key: "facebookPixelId",
    label: "Facebook Pixel ID",
    placeholder: "4196254764032585",
  },
  {
    key: "microsoftClarityId",
    label: "Microsoft Clarity ID",
    placeholder: "qumr08g8y2",
  },
  {
    key: "googleSearchConsoleCode",
    label: "Google Search Console Doğrulama Kodu",
    placeholder: "abc123XYZ...",
  },
  {
    key: "bingWebmasterCode",
    label: "Bing Webmaster Doğrulama Kodu",
    placeholder: "msvalidate.01 içeriği",
  },
  {
    key: "yandexWebmasterCode",
    label: "Yandex Webmaster Doğrulama Kodu",
    placeholder: "yandex-verification içeriği",
  },
] as const;

export type SiteTrackingGapFieldKey =
  (typeof SITE_TRACKING_GAP_FIELDS)[number]["key"];

export type SiteTrackingGapPrompt = {
  siteKey: string;
  siteLabel: string;
  domain: string;
  fields: Array<{
    key: SiteTrackingGapFieldKey;
    label: string;
    placeholder: string;
    value: string;
  }>;
};

export function listMissingSiteTrackingFields(
  row: Partial<Record<SiteTrackingGapFieldKey, string>>
): SiteTrackingGapPrompt["fields"] {
  return SITE_TRACKING_GAP_FIELDS.filter(
    (field) => !String(row[field.key] ?? "").trim()
  ).map((field) => ({
    key: field.key,
    label: field.label,
    placeholder: field.placeholder,
    value: String(row[field.key] ?? ""),
  }));
}

export function isSiteTrackingUnconfigured(
  row: Partial<Record<SiteTrackingGapFieldKey, string>>
): boolean {
  return listMissingSiteTrackingFields(row).length === SITE_TRACKING_GAP_FIELDS.length;
}

export function toSiteTrackingGapPrompt(input: {
  siteKey: string;
  siteLabel: string;
  domain: string;
  row: Partial<Record<SiteTrackingGapFieldKey, string>>;
}): SiteTrackingGapPrompt | null {
  const fields = listMissingSiteTrackingFields(input.row);
  if (fields.length === 0) return null;
  return {
    siteKey: input.siteKey,
    siteLabel: input.siteLabel,
    domain: input.domain,
    fields,
  };
}
