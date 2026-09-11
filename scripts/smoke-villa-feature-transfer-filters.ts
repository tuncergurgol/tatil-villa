/**
 * Villa özellik aktarım filtreleri smoke testi.
 *
 *   npx tsx scripts/smoke-villa-feature-transfer-filters.ts
 */
import {
  applyVillaFeatureTransferColumnFilters,
  emptyVillaFeatureTransferColumnFilters,
} from "../lib/villa-feature-transfer-filters";
import type { VillaFeatureTransferRow } from "../lib/queries/villa-feature-transfer";

const sampleRows: VillaFeatureTransferRow[] = [
  {
    id: "v1",
    villaId: 101,
    name: "Villa Alpha",
    originalName: "Alpha Original",
    slug: "villa-alpha",
    active: true,
    bedrooms: 2,
    amenities: ["Havuz", "WiFi"],
    rooms: [
      { features: ["Klima"], customFeatures: [], imageUrl: "" },
      { features: [], customFeatures: [], imageUrl: "/photo.jpg" },
    ],
    updatedAt: new Date(),
  },
  {
    id: "v2",
    villaId: 102,
    name: "Villa Beta",
    originalName: "Beta Original",
    slug: "villa-beta",
    active: false,
    bedrooms: 1,
    amenities: [],
    rooms: [{ features: ["TV"], customFeatures: [], imageUrl: "/ok.jpg" }],
    updatedAt: new Date(),
  },
];

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  const passiveOnly = applyVillaFeatureTransferColumnFilters(sampleRows, {
    ...emptyVillaFeatureTransferColumnFilters,
    status: "passive",
  });
  assert(passiveOnly.length === 1 && passiveOnly[0]?.name === "Villa Beta", "passive filter");

  const missingPhoto = applyVillaFeatureTransferColumnFilters(sampleRows, {
    ...emptyVillaFeatureTransferColumnFilters,
    roomInfo: "missing_photo",
  });
  assert(missingPhoto.length === 1 && missingPhoto[0]?.id === "v1", "missing photo filter");

  const missingFeatures = applyVillaFeatureTransferColumnFilters(sampleRows, {
    ...emptyVillaFeatureTransferColumnFilters,
    roomInfo: "missing_features",
  });
  assert(missingFeatures.length === 1 && missingFeatures[0]?.id === "v1", "missing features filter");

  const villaSearch = applyVillaFeatureTransferColumnFilters(sampleRows, {
    ...emptyVillaFeatureTransferColumnFilters,
    villaSearch: "102",
  });
  assert(villaSearch.length === 1 && villaSearch[0]?.name === "Villa Beta", "villa search");

  console.log("smoke-villa-feature-transfer-filters: OK");
}

main();
