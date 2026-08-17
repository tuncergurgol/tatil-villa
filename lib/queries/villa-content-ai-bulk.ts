import type { TourismDocumentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getPublishUndocumentedVillaSiteKeys,
  isVillaVisibleOnPublicSite,
} from "@/lib/public-villa-site-filter";
import { PUBLIC_SITE_KEYS, PUBLIC_SITE_META, type PublicSiteKey } from "@/lib/public-site-keys";

export type VillaContentAiBulkRow = {
  id: string;
  villaId: number | null;
  name: string;
  active: boolean;
  descriptionPreview: string;
  hasDescription: boolean;
  seoTitle: string;
  seoKeywords: string;
  seoDescription: string;
  hasSeoTitle: boolean;
  hasSeoKeywords: boolean;
  hasSeoDescription: boolean;
  siteLabels: string[];
  descriptionAiUpdatedAt: Date | null;
  descriptionAiReport: string;
  seoAiUpdatedAt: Date | null;
  seoAiReport: string;
  lastReportMessage: string;
  lastUpdatedAt: Date | null;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function previewText(value: string, max = 72) {
  const text = stripHtml(value);
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function resolveSiteLabels(
  villa: {
    active: boolean;
    documentNo: string;
    documentType: TourismDocumentType | null;
  },
  allowedSiteKeys: readonly PublicSiteKey[]
) {
  return PUBLIC_SITE_KEYS.filter((siteKey) =>
    isVillaVisibleOnPublicSite(villa, siteKey, allowedSiteKeys)
  ).map((siteKey) => PUBLIC_SITE_META[siteKey].label);
}

export async function getVillaContentAiBulkRows(): Promise<VillaContentAiBulkRow[]> {
  const [villas, allowedSiteKeys] = await Promise.all([
    prisma.villa.findMany({
      orderBy: [{ villaId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        villaId: true,
        name: true,
        active: true,
        description: true,
        seoTitle: true,
        seoKeywords: true,
        seoDescription: true,
        documentNo: true,
        documentType: true,
        descriptionAiUpdatedAt: true,
        descriptionAiReport: true,
        seoAiUpdatedAt: true,
        seoAiReport: true,
      },
    }),
    getPublishUndocumentedVillaSiteKeys(),
  ]);

  return villas.map((villa) => {
    const descriptionText = stripHtml(villa.description);
    const siteLabels = resolveSiteLabels(villa, allowedSiteKeys);
    const lastUpdatedAt =
      villa.descriptionAiUpdatedAt && villa.seoAiUpdatedAt
        ? new Date(
            Math.max(
              villa.descriptionAiUpdatedAt.getTime(),
              villa.seoAiUpdatedAt.getTime()
            )
          )
        : villa.descriptionAiUpdatedAt ?? villa.seoAiUpdatedAt;

    const lastReportMessage = [villa.descriptionAiReport, villa.seoAiReport]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(" | ");

    return {
      id: villa.id,
      villaId: villa.villaId,
      name: villa.name,
      active: villa.active,
      descriptionPreview: previewText(villa.description),
      hasDescription: Boolean(descriptionText),
      seoTitle: villa.seoTitle.trim(),
      seoKeywords: villa.seoKeywords.trim(),
      seoDescription: villa.seoDescription.trim(),
      hasSeoTitle: Boolean(villa.seoTitle.trim()),
      hasSeoKeywords: Boolean(villa.seoKeywords.trim()),
      hasSeoDescription: Boolean(villa.seoDescription.trim()),
      siteLabels,
      descriptionAiUpdatedAt: villa.descriptionAiUpdatedAt,
      descriptionAiReport: villa.descriptionAiReport,
      seoAiUpdatedAt: villa.seoAiUpdatedAt,
      seoAiReport: villa.seoAiReport,
      lastReportMessage,
      lastUpdatedAt,
    };
  });
}
