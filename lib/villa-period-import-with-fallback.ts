import { prisma } from "@/lib/db";
import {
  importVillaPeriodsFromExternalPage,
  scoreScrapedPageForPeriodImport,
  scrapedPageHasReliablePeriods,
} from "@/lib/external-villa-page-import-runner";
import { scrapeExternalVillaPage } from "@/lib/external-villa-page-scrape";
import type { VillaPeriodImportResult } from "@/lib/tatildeyiz-period-import-runner";
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
  return getExternalLinkUrls(villa).filter((link) =>
    supportsExternalPeriodImportKind(detectExternalSyncUrlKind(link.url))
  );
}

async function importFromExternalLink(
  villaId: string,
  slot: ExternalSyncSlot,
  url: string,
  options?: { dryRun?: boolean }
): Promise<VillaPeriodImportWithFallbackResult> {
  const result = await importVillaPeriodsFromExternalPage(villaId, url, options);
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
 * Airbnb / iCal / Tatildeyiz public URL burada kullanılmaz — fiyatlar panelde veya
 * harici rakip siteden gelir.
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
  let lastError: Error | null = null;

  for (const link of capableLinks) {
    try {
      const scraped = await scrapeExternalVillaPage(link.url);
      if (!scrapedPageHasReliablePeriods(scraped)) continue;
      const score = scoreScrapedPageForPeriodImport(scraped);
      if (score > bestScore) {
        bestScore = score;
        bestLink = link;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (!bestLink) {
    throw (
      lastError ??
      new Error("Periyot bulunamadı (tanımlı harici fiyat linkleri denendi)")
    );
  }

  return importFromExternalLink(villa.id, bestLink.slot, bestLink.url, options);
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
