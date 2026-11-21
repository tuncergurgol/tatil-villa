import { prisma } from "@/lib/db";
import { ensureDefaultAgencySites } from "@/lib/queries/agency-sites";
import {
  canonicalPublicDomain,
  getPublicSiteMeta,
  listPublicSiteKeys,
  siteKeyFromAgencyDomain,
  type PublicSiteKey,
  isPublicSiteKey,
} from "@/lib/public-site-keys";
import {
  canonicalOriginFromDomain,
  createIndexNowKey,
  indexNowKeyLocation,
} from "@/lib/search-discovery";

export type PublicSiteTrackingFields = {
  googleAnalyticsId: string;
  googleAdsId: string;
  microsoftClarityId: string;
  googleTagManagerId: string;
  facebookPixelId: string;
  googleSearchConsoleCode: string;
  bingWebmasterCode: string;
  yandexWebmasterCode: string;
  headScripts: string;
  bodyScripts: string;
};

export type PublicSiteTrackingRow = PublicSiteTrackingFields & {
  id: string;
  siteKey: PublicSiteKey;
  domain: string;
  label: string;
  indexNowKey: string;
  indexNowKeyUrl: string;
};

const EMPTY_FIELDS: PublicSiteTrackingFields = {
  googleAnalyticsId: "",
  googleAdsId: "",
  microsoftClarityId: "",
  googleTagManagerId: "",
  facebookPixelId: "",
  googleSearchConsoleCode: "",
  bingWebmasterCode: "",
  yandexWebmasterCode: "",
  headScripts: "",
  bodyScripts: "",
};

function withIndexNow(
  row: Omit<PublicSiteTrackingRow, "indexNowKey" | "indexNowKeyUrl">
): PublicSiteTrackingRow {
  const indexNowKey = createIndexNowKey(row.domain);
  return {
    ...row,
    indexNowKey,
    indexNowKeyUrl: indexNowKeyLocation(
      canonicalOriginFromDomain(row.domain),
      indexNowKey
    ),
  };
}

function toRow(
  siteKey: PublicSiteKey,
  row: {
    id: string;
    siteKey: string;
    domain: string;
    label: string;
  } & PublicSiteTrackingFields
): PublicSiteTrackingRow {
  const meta = getPublicSiteMeta(siteKey);
  return withIndexNow({
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
    bingWebmasterCode: row.bingWebmasterCode,
    yandexWebmasterCode: row.yandexWebmasterCode,
    headScripts: row.headScripts,
    bodyScripts: row.bodyScripts,
  });
}

function fallbackRow(siteKey: PublicSiteKey): PublicSiteTrackingRow {
  const meta = getPublicSiteMeta(siteKey);
  return withIndexNow({
    id: `fallback_${siteKey}`,
    siteKey,
    domain: meta.domain,
    label: meta.label,
    ...EMPTY_FIELDS,
    ...(siteKey === "tatildeyiz"
      ? { googleAnalyticsId: "G-3QYZX0CQ1D" }
      : {}),
  });
}

async function trackingTargets(): Promise<
  Array<{ siteKey: string; domain: string; label: string }>
> {
  await ensureDefaultAgencySites();
  const targets = new Map<string, { siteKey: string; domain: string; label: string }>();

  for (const siteKey of listPublicSiteKeys()) {
    const meta = getPublicSiteMeta(siteKey);
    targets.set(siteKey, {
      siteKey,
      domain: meta.domain,
      label: meta.label,
    });
  }

  const agencySites = await prisma.agencySite.findMany({
    where: { active: true },
    select: { name: true, domain: true },
  });
  for (const site of agencySites) {
    const siteKey = siteKeyFromAgencyDomain(site.domain);
    const domain = canonicalPublicDomain(site.domain);
    if (!domain) continue;
    const current = targets.get(siteKey);
    targets.set(siteKey, {
      siteKey,
      domain: current?.domain || domain,
      label: site.name.trim() || current?.label || siteKey,
    });
  }

  return [...targets.values()];
}

export async function ensurePublicSiteTrackingRows(): Promise<void> {
  for (const target of await trackingTargets()) {
    await prisma.publicSiteTracking.upsert({
      where: { siteKey: target.siteKey },
      create: {
        siteKey: target.siteKey,
        domain: target.domain,
        label: target.label,
        ...EMPTY_FIELDS,
        ...(target.siteKey === "tatildeyiz"
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
    const targets = await trackingTargets();
    const rows = await prisma.publicSiteTracking.findMany();
    const byKey = new Map(rows.map((row) => [row.siteKey, row]));
    return targets.map((target) => {
      const row = byKey.get(target.siteKey);
      if (!row) {
        return isPublicSiteKey(target.siteKey)
          ? fallbackRow(target.siteKey)
          : withIndexNow({
              id: `fallback_${target.siteKey}`,
              siteKey: target.siteKey,
              domain: target.domain,
              label: target.label,
              ...EMPTY_FIELDS,
            });
      }
      return toRow(target.siteKey, {
        ...row,
        domain: row.domain || target.domain,
        label: row.label || target.label,
      });
    });
  } catch (error) {
    console.error("[getAllPublicSiteTracking] fallback:", error);
    return listPublicSiteKeys().map(fallbackRow);
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
  const meta = getPublicSiteMeta(siteKey);
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
