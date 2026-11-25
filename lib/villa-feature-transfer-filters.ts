import type { VillaFeatureTransferRow } from "@/lib/queries/villa-feature-transfer";
import { includesSearchText } from "@/lib/search-text";
import {
  getVillaRoomInfoStatusLabels,
} from "@/lib/villa-room-info-status";

export type StatusFilter = "all" | "active" | "passive";
export type RoomInfoFilter =
  | "all"
  | "complete"
  | "missing_features"
  | "missing_photo";

export type VillaFeatureTransferColumnFilters = {
  villaSearch: string;
  originalNameSearch: string;
  status: StatusFilter;
  featureSearch: string;
  roomInfo: RoomInfoFilter;
};

export const emptyVillaFeatureTransferColumnFilters: VillaFeatureTransferColumnFilters =
  {
    villaSearch: "",
    originalNameSearch: "",
    status: "all",
    featureSearch: "",
    roomInfo: "all",
  };

export function applyVillaFeatureTransferColumnFilters(
  rows: VillaFeatureTransferRow[],
  filters: VillaFeatureTransferColumnFilters
) {
  return rows.filter((row) => {
    const villaLabel = `${row.villaId ?? ""} ${row.name}`.trim();
    if (
      filters.villaSearch.trim() &&
      !includesSearchText(villaLabel, filters.villaSearch)
    ) {
      return false;
    }

    if (
      filters.originalNameSearch.trim() &&
      !includesSearchText(row.originalName, filters.originalNameSearch)
    ) {
      return false;
    }

    if (filters.status === "active" && !row.active) return false;
    if (filters.status === "passive" && row.active) return false;

    const featureLabel = `${row.amenities.length} özellik`;
    if (
      filters.featureSearch.trim() &&
      !includesSearchText(featureLabel, filters.featureSearch)
    ) {
      return false;
    }

    const roomLabels = getVillaRoomInfoStatusLabels(row.bedrooms, row.rooms);

    if (filters.roomInfo === "complete") {
      if (roomLabels.length > 0 || row.bedrooms <= 0) return false;
    }
    if (filters.roomInfo === "missing_features") {
      if (!roomLabels.includes("Oda Bilgileri Eksik")) return false;
    }
    if (filters.roomInfo === "missing_photo") {
      if (!roomLabels.includes("Foto Eksik")) return false;
    }

    return true;
  });
}

export function countActiveVillaFeatureTransferFilters(
  filters: VillaFeatureTransferColumnFilters
) {
  let count = 0;
  if (filters.villaSearch.trim()) count += 1;
  if (filters.originalNameSearch.trim()) count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.featureSearch.trim()) count += 1;
  if (filters.roomInfo !== "all") count += 1;
  return count;
}
