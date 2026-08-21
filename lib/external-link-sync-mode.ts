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
