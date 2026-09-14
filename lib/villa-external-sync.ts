import { importAirbnbCalendarOccupancy } from "@/lib/airbnb-calendar-import-runner";
import { isAirbnbRoomUrl } from "@/lib/airbnb-calendar-scrape";
import { prisma } from "@/lib/db";
import {
  externalLinkSyncModeLabel,
  getExternalLinkSyncMode,
  type ExternalLinkSyncMode,
} from "@/lib/external-link-sync-mode";
import { importVillaPeriodsFromExternalPage } from "@/lib/external-villa-page-import-runner";
import { importVillaPeriodsFromTatildeyiz } from "@/lib/tatildeyiz-period-import-runner";
import { sleep } from "@/lib/tatildeyiz-gallery";
import { syncVillaIcalSource } from "@/lib/villa-ical-import-service";
import { reapplyConfirmedBookingReservedOccupancy } from "@/lib/villa-occupancy-service";

export const EXTERNAL_SYNC_SLOT_COUNT = 4 as const;

export type ExternalSyncSlot = 1 | 2 | 3 | 4;

export type ExternalSyncUrlKind =
  | "ical"
  | "tatildeyiz"
  | "airbnb"
  | "villa_page"
  | "unknown";

export type ExternalSyncLinkSlot = {
  slot: ExternalSyncSlot;
  url: string;
  lastSyncedAt: Date | null;
  lastMessage: string;
};

export type ExternalSyncResult = {
  villaId: string;
  villaName: string;
  slot: ExternalSyncSlot;
  url: string;
  kind: ExternalSyncUrlKind;
  ok: boolean;
  message: string;
};

/** Varsayılan 1 saat — cron / script ile kullanılır. */
export const DEFAULT_VILLA_EXTERNAL_SYNC_INTERVAL_MS = 60 * 60 * 1000;

export function getVillaExternalSyncIntervalMs(): number {
  const raw = process.env.VILLA_EXTERNAL_SYNC_INTERVAL_MS?.trim();
  if (!raw) return DEFAULT_VILLA_EXTERNAL_SYNC_INTERVAL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_VILLA_EXTERNAL_SYNC_INTERVAL_MS;
  }
  return parsed;
}

export function isExternalSyncSlot(value: number): value is ExternalSyncSlot {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function externalIcalSourceName(slot: ExternalSyncSlot): string {
  return `Harici Sync ${slot}`;
}

export function isExternalIcalSourceName(name: string): boolean {
  return /^Harici Sync [1-4]$/.test(name.trim());
}

export function detectExternalSyncUrlKind(url: string): ExternalSyncUrlKind {
  const trimmed = url.trim();
  if (!trimmed) return "unknown";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "unknown";
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    return "unknown";
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "tatildeyiz.com.tr" || host.endsWith(".tatildeyiz.com.tr")) {
    return "tatildeyiz";
  }

  if (isAirbnbRoomUrl(trimmed)) {
    return "airbnb";
  }

  const path = parsed.pathname.toLowerCase();
  const search = parsed.search.toLowerCase();
  const full = `${path}?${search}`;

  if (
    path.endsWith(".ics") ||
    /\.ics(\?|$)/i.test(trimmed) ||
    path.includes("/ical") ||
    path.includes("calendar.ics") ||
    /[?&](format|export|type)=(ical|ics)\b/i.test(full) ||
    /ical/i.test(path)
  ) {
    return "ical";
  }

  // Public villa sayfası (HTML scrape → fiyat + müsaitlik)
  return "villa_page";
}

/** Harici siteden fiyat periyodu aktarımı (Airbnb/iCal yalnızca takvim). */
export function supportsExternalPeriodImportKind(
  kind: ExternalSyncUrlKind
): boolean {
  return kind === "villa_page";
}

export function extractTatildeyizSlugFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== "tatildeyiz.com.tr" && !host.endsWith(".tatildeyiz.com.tr")) {
    return null;
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const reserved = new Set([
    "admin",
    "api",
    "blog",
    "arama",
    "auth",
    "static",
    "_next",
  ]);
  const slug = decodeURIComponent(parts[0] ?? "").trim();
  if (!slug || reserved.has(slug.toLowerCase())) return null;
  return slug;
}

type VillaExternalSyncFields = {
  id: string;
  name: string;
  slug: string;
  villaId: number | null;
  externalSyncUrl1: string;
  externalSyncUrl2: string;
  externalSyncUrl3: string;
  externalSyncUrl4: string;
  externalSyncLastSyncedAt1: Date | null;
  externalSyncLastSyncedAt2: Date | null;
  externalSyncLastSyncedAt3: Date | null;
  externalSyncLastSyncedAt4: Date | null;
  externalSyncLastMessage1: string;
  externalSyncLastMessage2: string;
  externalSyncLastMessage3: string;
  externalSyncLastMessage4: string;
};

function urlField(slot: ExternalSyncSlot) {
  return `externalSyncUrl${slot}` as const;
}

function syncedAtField(slot: ExternalSyncSlot) {
  return `externalSyncLastSyncedAt${slot}` as const;
}

function messageField(slot: ExternalSyncSlot) {
  return `externalSyncLastMessage${slot}` as const;
}

export function getExternalSyncSlots(
  villa: Pick<
    VillaExternalSyncFields,
    | "externalSyncUrl1"
    | "externalSyncUrl2"
    | "externalSyncUrl3"
    | "externalSyncUrl4"
    | "externalSyncLastSyncedAt1"
    | "externalSyncLastSyncedAt2"
    | "externalSyncLastSyncedAt3"
    | "externalSyncLastSyncedAt4"
    | "externalSyncLastMessage1"
    | "externalSyncLastMessage2"
    | "externalSyncLastMessage3"
    | "externalSyncLastMessage4"
  >
): ExternalSyncLinkSlot[] {
  return ([1, 2, 3, 4] as const).map((slot) => ({
    slot,
    url: villa[urlField(slot)] ?? "",
    lastSyncedAt: villa[syncedAtField(slot)] ?? null,
    lastMessage: villa[messageField(slot)] ?? "",
  }));
}

async function markSlotResult(
  villaId: string,
  slot: ExternalSyncSlot,
  message: string
) {
  await prisma.villa.update({
    where: { id: villaId },
    data: {
      [syncedAtField(slot)]: new Date(),
      [messageField(slot)]: message,
    },
  });
}

async function syncIcalExternalLink(
  villaId: string,
  slot: ExternalSyncSlot,
  url: string
): Promise<{ ok: boolean; message: string }> {
  const name = externalIcalSourceName(slot);
  const existing = await prisma.villaIcalSource.findFirst({
    where: { villaId, name },
    select: { id: true },
  });

  const source = existing
    ? await prisma.villaIcalSource.update({
        where: { id: existing.id },
        data: { url },
        select: { id: true },
      })
    : await prisma.villaIcalSource.create({
        data: {
          villaId,
          name,
          url,
          sortOrder: 1000 + slot,
        },
        select: { id: true },
      });

  const result = await syncVillaIcalSource(source.id);
  return { ok: result.ok, message: result.message };
}

async function syncTatildeyizExternalLink(
  villa: Pick<VillaExternalSyncFields, "id" | "slug" | "villaId" | "name">,
  url: string,
  syncMode: ExternalLinkSyncMode
): Promise<{ ok: boolean; message: string }> {
  if (syncMode === "calendar") {
    return {
      ok: true,
      message:
        "Tatildeyiz linki fiyat+takvim birlikte aktarır; Link 2 (yalnızca takvim) için atlandı",
    };
  }

  const slug = extractTatildeyizSlugFromUrl(url);
  if (!slug) {
    return {
      ok: false,
      message: "Tatildeyiz villa slug'ı URL'den okunamadı",
    };
  }

  try {
    // Fiyat-only: mevcut takvim doluluğunu import sonrası geri yaz.
    const priorOccupancy =
      syncMode === "price"
        ? await prisma.villaPricePeriodDay.findMany({
            where: { villaId: villa.id },
            select: { date: true, occupancyStatus: true, occupancyCheckIn: true },
          })
        : null;

    const result = await importVillaPeriodsFromTatildeyiz(villa.id, slug);

    if (priorOccupancy && priorOccupancy.length > 0) {
      await prisma.$transaction(
        priorOccupancy.map((day) =>
          prisma.villaPricePeriodDay.updateMany({
            where: { villaId: villa.id, date: day.date },
            data: {
              occupancyStatus: day.occupancyStatus,
              occupancyCheckIn: day.occupancyCheckIn,
            },
          })
        )
      );
    }

    await reapplyConfirmedBookingReservedOccupancy(villa.id);

    if (syncMode === "price") {
      return {
        ok: true,
        message: `${result.periodCount} periyot fiyat güncellendi (takvim korundu; ${result.dayCount} gün)`,
      };
    }
    return {
      ok: true,
      message: `${result.periodCount} periyot, ${result.dayCount} gün aktarıldı (${result.bookedDays} dolu, ${result.optionDays} opsiyon)`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Tatildeyiz aktarımı başarısız",
    };
  }
}

async function syncAirbnbExternalLink(
  villaId: string,
  slot: ExternalSyncSlot,
  url: string,
  syncMode: ExternalLinkSyncMode
): Promise<{ ok: boolean; message: string }> {
  if (syncMode === "price") {
    return {
      ok: true,
      message: "Airbnb yalnızca takvim destekler; Link 3 (fiyat) için atlandı",
    };
  }

  try {
    const result = await importAirbnbCalendarOccupancy(villaId, url, slot);
    return {
      ok: true,
      message: `Airbnb ${result.listingId}: ${result.stayCount} kapalı dönem, ${result.blockedDays} dolu gün (${result.importedCount} güncellendi, ${result.removedCount} kaldırıldı; ${result.updatedDays} gün değişti)`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Airbnb takvim aktarımı başarısız",
    };
  }
}

async function syncVillaPageExternalLink(
  villaId: string,
  url: string,
  syncMode: ExternalLinkSyncMode
): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await importVillaPeriodsFromExternalPage(villaId, url, {
      syncMode,
    });
    const warningSuffix =
      result.warnings.length > 0 ? ` — ${result.warnings[0]}` : "";
    const modeLabel = externalLinkSyncModeLabel(syncMode);

    if (syncMode === "calendar") {
      return {
        ok: true,
        message: `${result.sourceHost} (${result.strategy}): ${modeLabel} güncellendi (${result.bookedDays} dolu, ${result.optionDays} opsiyon)${warningSuffix}`,
      };
    }
    if (syncMode === "price") {
      return {
        ok: true,
        message: `${result.sourceHost} (${result.strategy}): ${modeLabel} güncellendi (${result.periodCount} periyot, ${result.dayCount} gün; takvim korundu)${warningSuffix}`,
      };
    }
    if (result.periodCount === 0) {
      return {
        ok: true,
        message: `${result.sourceHost} (${result.strategy}): takvim güncellendi (${result.bookedDays} dolu, ${result.optionDays} opsiyon); fiyatlar korundu${warningSuffix}`,
      };
    }
    return {
      ok: true,
      message: `${result.sourceHost} (${result.strategy}): ${result.periodCount} periyot, ${result.dayCount} gün (${result.bookedDays} dolu, ${result.optionDays} opsiyon)${warningSuffix}`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Public villa sayfası aktarımı başarısız",
    };
  }
}

export async function syncVillaExternalLinkSlot(
  villaId: string,
  slot: ExternalSyncSlot,
  options?: { urlOverride?: string }
): Promise<ExternalSyncResult> {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      id: true,
      name: true,
      slug: true,
      villaId: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
      externalSyncUrl3: true,
      externalSyncUrl4: true,
      externalSyncLastSyncedAt1: true,
      externalSyncLastSyncedAt2: true,
      externalSyncLastSyncedAt3: true,
      externalSyncLastSyncedAt4: true,
      externalSyncLastMessage1: true,
      externalSyncLastMessage2: true,
      externalSyncLastMessage3: true,
      externalSyncLastMessage4: true,
    },
  });

  if (!villa) {
    return {
      villaId,
      villaName: "",
      slot,
      url: "",
      kind: "unknown",
      ok: false,
      message: "Villa bulunamadı",
    };
  }

  const url = (options?.urlOverride ?? villa[urlField(slot)] ?? "").trim();
  if (!url) {
    return {
      villaId: villa.id,
      villaName: villa.name,
      slot,
      url: "",
      kind: "unknown",
      ok: false,
      message: "Bu slotta kayıtlı link yok",
    };
  }

  const kind = detectExternalSyncUrlKind(url);
  const syncMode = getExternalLinkSyncMode(slot);
  let outcome: { ok: boolean; message: string };

  if (kind === "ical") {
    if (syncMode === "price") {
      outcome = {
        ok: true,
        message: "iCal yalnızca takvim destekler; Link 3 (fiyat) için atlandı",
      };
    } else {
      outcome = await syncIcalExternalLink(villa.id, slot, url);
    }
  } else if (kind === "tatildeyiz") {
    outcome = await syncTatildeyizExternalLink(villa, url, syncMode);
  } else if (kind === "airbnb") {
    outcome = await syncAirbnbExternalLink(villa.id, slot, url, syncMode);
  } else if (kind === "villa_page") {
    outcome = await syncVillaPageExternalLink(villa.id, url, syncMode);
  } else {
    outcome = {
      ok: false,
      message:
        "Desteklenmeyen link. .ics / iCal, tatildeyiz.com.tr, Airbnb oda linki veya public villa sayfası URL'si gerekli.",
    };
  }

  await markSlotResult(villa.id, slot, outcome.message);

  await prisma.villaIcalSyncEvent.create({
    data: {
      villaId: villa.id,
      message: `Harici sync ${slot} [${externalLinkSyncModeLabel(syncMode)}] (${kind}): ${outcome.message}`,
    },
  });

  return {
    villaId: villa.id,
    villaName: villa.name,
    slot,
    url,
    kind,
    ok: outcome.ok,
    message: outcome.message,
  };
}

export async function setVillaExternalSyncUrl(
  villaId: string,
  slot: ExternalSyncSlot,
  url: string
): Promise<{ ok: boolean; message: string }> {
  const trimmed = url.trim();

  if (trimmed) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { ok: false, message: "Geçerli bir URL girin" };
    }
    if (!/^https?:$/i.test(parsed.protocol)) {
      return { ok: false, message: "URL http veya https olmalı" };
    }
  }

  await prisma.villa.update({
    where: { id: villaId },
    data: {
      [urlField(slot)]: trimmed,
      ...(trimmed
        ? {}
        : {
            [syncedAtField(slot)]: null,
            [messageField(slot)]: "",
          }),
    },
  });

  if (!trimmed) {
    await prisma.villaIcalSource.deleteMany({
      where: { villaId, name: externalIcalSourceName(slot) },
    });
  } else if (detectExternalSyncUrlKind(trimmed) === "ical") {
    const name = externalIcalSourceName(slot);
    const existing = await prisma.villaIcalSource.findFirst({
      where: { villaId, name },
      select: { id: true },
    });
    if (existing) {
      await prisma.villaIcalSource.update({
        where: { id: existing.id },
        data: { url: trimmed },
      });
    }
  }

  await prisma.villaIcalSyncEvent.create({
    data: {
      villaId,
      message: trimmed
        ? `Harici sync ${slot} linki kaydedildi`
        : `Harici sync ${slot} linki silindi`,
    },
  });

  return {
    ok: true,
    message: trimmed ? "Link kaydedildi" : "Link temizlendi",
  };
}

/**
 * Tüm villalardaki dolu harici sync linklerini dolaşır.
 * Interval: VILLA_EXTERNAL_SYNC_INTERVAL_MS (varsayılan 1 saat).
 * Bu fonksiyon “şimdi sync et” yapar; interval’ı çağıran cron/scheduler uygular.
 *
 * Örnek Vercel cron (vercel.json):
 * { "path": "/api/cron/villa-external-sync", "schedule": "0 * * * *" }
 */
export async function syncAllVillaExternalLinks(options?: {
  skipRecentlySynced?: boolean;
}): Promise<ExternalSyncResult[]> {
  const skipRecentlySynced = options?.skipRecentlySynced ?? true;
  const intervalMs = getVillaExternalSyncIntervalMs();
  const cutoff = new Date(Date.now() - intervalMs);

  const villas = await prisma.villa.findMany({
    where: {
      OR: [
        { externalSyncUrl1: { not: "" } },
        { externalSyncUrl2: { not: "" } },
        { externalSyncUrl3: { not: "" } },
        { externalSyncUrl4: { not: "" } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      villaId: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
      externalSyncUrl3: true,
      externalSyncUrl4: true,
      externalSyncLastSyncedAt1: true,
      externalSyncLastSyncedAt2: true,
      externalSyncLastSyncedAt3: true,
      externalSyncLastSyncedAt4: true,
      externalSyncLastMessage1: true,
      externalSyncLastMessage2: true,
      externalSyncLastMessage3: true,
      externalSyncLastMessage4: true,
    },
    orderBy: { name: "asc" },
  });

  const results: ExternalSyncResult[] = [];

  for (const villa of villas) {
    for (const slot of getExternalSyncSlots(villa)) {
      if (!slot.url.trim()) continue;

      if (
        skipRecentlySynced &&
        slot.lastSyncedAt &&
        slot.lastSyncedAt > cutoff
      ) {
        results.push({
          villaId: villa.id,
          villaName: villa.name,
          slot: slot.slot,
          url: slot.url,
          kind: detectExternalSyncUrlKind(slot.url),
          ok: true,
          message: `Atlandı (son sync ${Math.round(
            (Date.now() - slot.lastSyncedAt.getTime()) / 60_000
          )} dk önce; interval ${Math.round(intervalMs / 60_000)} dk)`,
        });
        continue;
      }

      results.push(await syncVillaExternalLinkSlot(villa.id, slot.slot));

      // Public sayfa / Airbnb scrape'lerinde nazik rate-limit (cron / toplu sync)
      const kind = detectExternalSyncUrlKind(slot.url);
      if (kind === "villa_page" || kind === "airbnb") {
        await sleep(500);
      }
    }
  }

  return results;
}
