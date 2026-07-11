"use client";

import { useRef } from "react";
import type { Villa, VillaPool } from "@prisma/client";
import { Sparkles } from "lucide-react";
import VillaFeaturesPicker, {
  type VillaFeaturesPickerHandle,
} from "@/components/admin/amenities/VillaFeaturesPicker";
import VillaPoolManager from "@/components/admin/villas/VillaPoolManager";
import VillaPriceInclusionPicker, {
  type VillaPriceInclusionPickerHandle,
} from "@/components/admin/villas/VillaPriceInclusionPicker";
import VillaShowcaseManagement, {
  type VillaShowcaseManagementHandle,
} from "@/components/admin/villas/VillaShowcaseManagement";
import type { AmenityCategoryItem } from "@/lib/queries/amenities";
import type { FacilityCategoryOption } from "@/lib/queries/facility-categories";
import type { PriceInclusionItem } from "@/lib/queries/price-inclusion";

interface VillaFeaturesTabProps {
  villa: Villa;
  pools: VillaPool[];
  amenityCategories: AmenityCategoryItem[];
  facilityCategories: FacilityCategoryOption[];
  priceInclusionItems: PriceInclusionItem[];
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-800">{title}</h2>
      {children}
    </section>
  );
}

export default function VillaFeaturesTab({
  villa,
  pools,
  amenityCategories,
  facilityCategories,
  priceInclusionItems,
}: VillaFeaturesTabProps) {
  const featuresPickerRef = useRef<VillaFeaturesPickerHandle>(null);
  const priceInclusionRef = useRef<VillaPriceInclusionPickerHandle>(null);
  const showcaseRef = useRef<VillaShowcaseManagementHandle>(null);

  function applyDefaults() {
    featuresPickerRef.current?.applyDefaults();
    priceInclusionRef.current?.applyDefaults();
    showcaseRef.current?.applyDefaults();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={applyDefaults}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          <Sparkles className="h-4 w-4" />
          DEFAULT
        </button>
      </div>

      <Section title="Ev Olanakları">
        <VillaFeaturesPicker
          ref={featuresPickerRef}
          amenityCategories={amenityCategories}
          facilityCategories={facilityCategories}
          selectedAmenityNames={villa.amenities}
          selectedFacilityCategoryNames={villa.facilityCategories}
          showFacilityCategories={false}
        />
      </Section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <VillaPoolManager villaId={villa.id} pools={pools} />
      </section>

      <Section title="Fiyata Dahil Olan / Olmayan">
        <VillaPriceInclusionPicker
          ref={priceInclusionRef}
          items={priceInclusionItems}
          selectedIds={villa.priceInclusionIds}
        />
      </Section>

      <Section title="Vitrin Yönetimi">
        <VillaShowcaseManagement ref={showcaseRef} villa={villa} />
      </Section>
    </div>
  );
}
