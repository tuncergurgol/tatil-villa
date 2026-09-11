import { prisma } from "@/lib/db";
import {
  importVillaPeriodsFromExternalPage,
  scoreScrapedPageForPeriodImport,
  scrapedPageHasReliablePeriods,
  scrapedPageIsOccupancyOnly,
} from "@/lib/external-villa-page-import-runner";
import { scrapeExternalVillaPage } from "@/lib/external-villa-page-scrape";
import type { VillaPeriodImportResult } from "@/lib/tatildeyiz-period-import-runner";
import { getExternalLinkSyncMode } from "@/lib/external-link-sync-mode";
import {
  detectExternalSyncUrlKind,
  supportsExternalPeriodImportKind,
  type ExternalSyncSlot,
} from "@/lib/villa-external-sync";

export type VillaPeriodImportWithFallbackResult = VillaPeriodImportResult & {
  source: "external_link";
  sourceLabel: string;
  linkSlot: ExternalSyncSlot;
};

function getExternalLinkUrls(villa: {
  externalSyncUrl1: string;
  externalSyncUrl2: string;
  externalSyncUrl3: string;
  externalSyncUrl4: string;
}): Array<{ slot: ExternalSyncSlot; url: string }> {
  return ([1, 2, 3, 4] as const)
    .map((slot) => ({
      slot,
      url: villa[`externalSyncUrl${slot}`]?.trim() ?? "",
    }))
    .filter((item) => item.url);
}

function getPeriodImportCapableLinks(villa: {
  externalSyncUrl1: string;
  externalSyncUrl2: string;
  externalSyncUrl3: string;
  externalSyncUrl4: string;
}) {
  // Fiyat için Link 1 ve Link 3 (Link 2 yalnızca takvim).
  return getExternalLinkUrls(villa).filter((link) => {
    if (link.slot === 2) return false;
    return supportsExternalPeriodImportKind(
      detectExternalSyncUrlKind(link.url)
    );
  });
}

async function importFromExternalLink(
  villaId: string,
  slot: ExternalSyncSlot,
  url: string,
  options?: { dryRun?: boolean }
): Promise<VillaPeriodImportWithFallbackResult> {
  const syncMode = getExternalLinkSyncMode(slot);
  const result = await importVillaPeriodsFromExternalPage(villaId, url, {
    ...options,
    syncMode,
  });
  return {
    periodCount: result.periodCount,
    dayCount: result.dayCount,
    bookedDays: result.bookedDays,
    optionDays: result.optionDays,
    source: "external_link",
    sourceLabel: `Link ${slot} (${result.sourceHost})`,
    linkSlot: slot,
  };
}

/**
 * Tanımlı harici villa sayfası linklerinden (villakalkan, hepsivilla vb.) periyot aktarır.
 * Airbnb / iCal burada kullanılmaz — yalnızca takvim içindir.
 *
 * Kaynakta yalnızca takvim varsa occupancy overlay uygulanır; bu hata sayılmaz.
 */
export async function importVillaPeriodsWithFallback(
  villaId: string,
  options?: { dryRun?: boolean }
): Promise<VillaPeriodImportWithFallbackResult> {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      id: true,
      slug: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
      externalSyncUrl3: true,
      externalSyncUrl4: true,
    },
  });

  if (!villa) {
    throw new Error("Villa bulunamadı");
  }

  const capableLinks = getPeriodImportCapableLinks(villa);
  if (capableLinks.length === 0) {
    throw new Error(
      "Harici fiyat periyodu linki yok (Link 1–4’te villakalkan/hepsivilla vb. villa sayfası gerekir; Airbnb/iCal yalnızca takvim içindir)"
    );
  }

  let bestLink: (typeof capableLinks)[number] | null = null;
  let bestScore = -1;
  let occupancyOnlyLink: (typeof capableLinks)[number] | null = null;
  let lastError: Error | null = null;

  for (const link of capableLinks) {
    try {
      const scraped = await scrapeExternalVillaPage(link.url);
      if (scrapedPageHasReliablePeriods(scraped)) {
        const score = scoreScrapedPageForPeriodImport(scraped);
        if (score > bestScore) {
          bestScore = score;
          bestLink = link;
        }
        continue;
      }
      if (
        !occupancyOnlyLink &&
        (scrapedPageIsOccupancyOnly(scraped) ||
          scraped.occupancyByDateKey.size > 0)
      ) {
        occupancyOnlyLink = link;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (bestLink) {
    return importFromExternalLink(
      villa.id,
      bestLink.slot,
      bestLink.url,
      options
    );
  }

  if (occupancyOnlyLink) {
    return importFromExternalLink(
      villa.id,
      occupancyOnlyLink.slot,
      occupancyOnlyLink.url,
      options
    );
  }

  throw (
    lastError ??
    new Error("Periyot bulunamadı (tanımlı harici fiyat linkleri denendi)")
  );
}

/**
 * Takvim/fiyat otomatik güncelleme: fiyat linki yoksa null döner (hata değil).
 */
export async function tryImportVillaPeriodsFromExternalLinks(
  villaId: string,
  options?: { dryRun?: boolean }
): Promise<VillaPeriodImportWithFallbackResult | null> {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      id: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
      externalSyncUrl3: true,
      externalSyncUrl4: true,
    },
  });

  if (!villa || getPeriodImportCapableLinks(villa).length === 0) {
    return null;
  }

  return importVillaPeriodsWithFallback(villaId, options);
}
