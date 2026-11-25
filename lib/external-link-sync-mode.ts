import type { ExternalSyncSlot } from "@/lib/villa-external-sync";

/** Link slotlarına göre senkron kapsamı. */
export type ExternalLinkSyncMode =
  | "calendar_and_price"
  | "calendar"
  | "price";

/**
 * Link 1 → takvim + fiyat
 * Link 2 → yalnızca takvim
 * Link 3 → yalnızca fiyat
 * Link 4 → takvim + fiyat (yedek)
 */
export function getExternalLinkSyncMode(
  slot: ExternalSyncSlot
): ExternalLinkSyncMode {
  if (slot === 2) return "calendar";
  if (slot === 3) return "price";
  return "calendar_and_price";
}

/**
 * Batch sync sırası: önce fiyat (gün satırlarını oluşturur),
 * sonra fiyat+takvim, en sonda yalnızca takvim.
 * Aksi halde Airbnb/iCal kapaması henüz olmayan günlere yazılamaz
 * ve fiyat aktarımı boş günlerle takvimi “açık” bırakır.
 */
export function getExternalLinkSyncBatchOrder(
  mode: ExternalLinkSyncMode
): number {
  if (mode === "price") return 0;
  if (mode === "calendar_and_price") return 1;
  return 2;
}

export function externalLinkSyncModeLabel(mode: ExternalLinkSyncMode): string {
  switch (mode) {
    case "calendar":
      return "Takvim";
    case "price":
      return "Fiyat";
    default:
      return "Takvim + Fiyat";
  }
}
