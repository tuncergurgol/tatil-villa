import { prisma } from "@/lib/db";
import { importVillaPeriodsFromExternalPage } from "@/lib/external-villa-page-import-runner";
import { importVillaPeriodsFromTatildeyiz } from "@/lib/tatildeyiz-period-import-runner";
import type { VillaPeriodImportResult } from "@/lib/tatildeyiz-period-import-runner";
import {
  detectExternalSyncUrlKind,
  extractTatildeyizSlugFromUrl,
  type ExternalSyncSlot,
} from "@/lib/villa-external-sync";

export type VillaPeriodImportWithFallbackResult = VillaPeriodImportResult & {
  source: "tatildeyiz" | "external_link";
  sourceLabel: string;
  linkSlot?: ExternalSyncSlot;
};

function shouldFallbackFromTatildeyiz(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /periyot bulunamadı/i.test(message) ||
    /kaynak sayfası bulunamadı/i.test(message) ||
    /Tatildeyiz kaynağına bağlı değil/i.test(message) ||
    /Transaction already closed/i.test(message) ||
    /expired transaction/i.test(message)
  );
}

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

async function importFromExternalLink(
  villaId: string,
  slot: ExternalSyncSlot,
  url: string,
  options?: { dryRun?: boolean }
): Promise<VillaPeriodImportWithFallbackResult> {
  const kind = detectExternalSyncUrlKind(url);

  if (kind === "tatildeyiz") {
    const slug = extractTatildeyizSlugFromUrl(url);
    if (!slug) {
      throw new Error("Tatildeyiz villa slug'ı URL'den okunamadı");
    }
    const result = await importVillaPeriodsFromTatildeyiz(villaId, slug, options);
    return {
      ...result,
      source: "tatildeyiz",
      sourceLabel: `Link ${slot} (Tatildeyiz)`,
      linkSlot: slot,
    };
  }

  if (kind === "villa_page") {
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

  throw new Error(`Link ${slot} periyot aktarımı için uygun değil (${kind})`);
}

/**
 * Önce Tatildeyiz slug'ından periyot aktarır; başarısız olursa veya periyot yoksa
 * villa harici linklerinden (1-4) periyot oluşturmayı dener.
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

  const externalLinks = getExternalLinkUrls(villa);
  let lastError: Error | null = null;

  if (villa.slug.trim()) {
    try {
      const result = await importVillaPeriodsFromTatildeyiz(
        villa.id,
        villa.slug,
        options
      );
      return {
        ...result,
        source: "tatildeyiz",
        sourceLabel: "Tatildeyiz",
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!shouldFallbackFromTatildeyiz(error) || externalLinks.length === 0) {
        throw lastError;
      }
    }
  }

  for (const link of externalLinks) {
    try {
      return await importFromExternalLink(villa.id, link.slot, link.url, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw (
    lastError ??
    new Error(
      villa.slug.trim()
        ? "Periyot bulunamadı (Tatildeyiz ve harici linkler denendi)"
        : "Periyot bulunamadı (harici link tanımlı değil)"
    )
  );
}
