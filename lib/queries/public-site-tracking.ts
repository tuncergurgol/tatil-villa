import { prisma } from "@/lib/db";
import {
  PUBLIC_SITE_KEYS,
  PUBLIC_SITE_META,
  type PublicSiteKey,
  isPublicSiteKey,
} from "@/lib/public-site-keys";

export type PublicSiteTrackingFields = {
  googleAnalyticsId: string;
  googleAdsId: string;
  microsoftClarityId: string;
  googleTagManagerId: string;
  facebookPixelId: string;
  googleSearchConsoleCode: string;
  headScripts: string;
  bodyScripts: string;
};

export type PublicSiteTrackingRow = PublicSiteTrackingFields & {
  id: string;
  siteKey: PublicSiteKey;
  domain: string;
  label: string;
};

const EMPTY_FIELDS: PublicSiteTrackingFields = {
  googleAnalyticsId: "",
  googleAdsId: "",
  microsoftClarityId: "",
  googleTagManagerId: "",
  facebookPixelId: "",
  googleSearchConsoleCode: "",
  headScripts: "",
  bodyScripts: "",
};

function toRow(
  siteKey: PublicSiteKey,
  row: {
    id: string;
    siteKey: string;
    domain: string;
    label: string;
  } & PublicSiteTrackingFields
): PublicSiteTrackingRow {
  const meta = PUBLIC_SITE_META[siteKey];
  return {
    id: row.id,
    siteKey,
    domain: row.domain || meta.domain,
    label: row.label || meta.label,
    googleAnalyticsId: row.googleAnalyticsId,
    googleAdsId: row.googleAdsId,
    microsoftClarityId: row.microsoftClarityId,
    googleTagManagerId: row.googleTagManagerId,
    facebookPixelId: row.facebookPixelId,
    googleSearchConsoleCode: row.googleSearchConsoleCode,
    headScripts: row.headScripts,
    bodyScripts: row.bodyScripts,
  };
}

function fallbackRow(siteKey: PublicSiteKey): PublicSiteTrackingRow {
  const meta = PUBLIC_SITE_META[siteKey];
  return {
    id: `fallback_${siteKey}`,
    siteKey,
    domain: meta.domain,
    label: meta.label,
    ...EMPTY_FIELDS,
    ...(siteKey === "tatildeyiz"
      ? { googleAnalyticsId: "G-3QYZX0CQ1D" }
      : {}),
  };
}

export async function ensurePublicSiteTrackingRows(): Promise<void> {
  for (const siteKey of PUBLIC_SITE_KEYS) {
    const meta = PUBLIC_SITE_META[siteKey];
    await prisma.publicSiteTracking.upsert({
      where: { siteKey },
      create: {
        siteKey,
        domain: meta.domain,
        label: meta.label,
        ...EMPTY_FIELDS,
        ...(siteKey === "tatildeyiz"
          ? { googleAnalyticsId: "G-3QYZX0CQ1D" }
          : {}),
      },
      update: {},
    });
  }
}

export async function getAllPublicSiteTracking(): Promise<PublicSiteTrackingRow[]> {
  try {
    await ensurePublicSiteTrackingRows();
    const rows = await prisma.publicSiteTracking.findMany();
    const byKey = new Map(
      rows.filter((r) => isPublicSiteKey(r.siteKey)).map((r) => [r.siteKey, r])
    );
    return PUBLIC_SITE_KEYS.map((siteKey) => {
      const row = byKey.get(siteKey);
      return row ? toRow(siteKey, row) : fallbackRow(siteKey);
    });
  } catch (error) {
    console.error("[getAllPublicSiteTracking] fallback:", error);
    return PUBLIC_SITE_KEYS.map(fallbackRow);
  }
}

export async function getPublicSiteTracking(
  siteKey: PublicSiteKey
): Promise<PublicSiteTrackingRow> {
  try {
    const row = await prisma.publicSiteTracking.findUnique({
      where: { siteKey },
    });
    if (row && isPublicSiteKey(row.siteKey)) {
      return toRow(siteKey, row);
    }
    return fallbackRow(siteKey);
  } catch (error) {
    console.error("[getPublicSiteTracking] fallback:", error);
    return fallbackRow(siteKey);
  }
}

export async function upsertPublicSiteTracking(
  siteKey: PublicSiteKey,
  data: PublicSiteTrackingFields
) {
  const meta = PUBLIC_SITE_META[siteKey];
  return prisma.publicSiteTracking.upsert({
    where: { siteKey },
    create: {
      siteKey,
      domain: meta.domain,
      label: meta.label,
      ...data,
    },
    update: data,
  });
}

export async function upsertAllPublicSiteTracking(
  entries: Array<{ siteKey: PublicSiteKey; data: PublicSiteTrackingFields }>
) {
  await Promise.all(
    entries.map(({ siteKey, data }) => upsertPublicSiteTracking(siteKey, data))
  );
}
