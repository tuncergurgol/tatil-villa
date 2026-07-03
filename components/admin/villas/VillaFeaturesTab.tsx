"use client";

import type { Villa, VillaPool } from "@prisma/client";
import VillaFeaturesPicker from "@/components/admin/amenities/VillaFeaturesPicker";
import VillaPoolManager from "@/components/admin/villas/VillaPoolManager";
import VillaPriceInclusionPicker from "@/components/admin/villas/VillaPriceInclusionPicker";
import VillaShowcaseManagement from "@/components/admin/villas/VillaShowcaseManagement";
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
  return (
    <div className="space-y-6">
      <Section title="Tesis Olanakları">
        <VillaFeaturesPicker
          amenityCategories={amenityCategories}
          facilityCategories={facilityCategories}
          selectedAmenityNames={villa.amenities}
          selectedFacilityCategoryNames={villa.facilityCategories}
          showFacilityCategories={false}
        />
      </Section>

      <Section title="Havuz Yönetimi">
        <VillaPoolManager villaId={villa.id} pools={pools} />
      </Section>

      <Section title="Fiyata Dahil Olan / Olmayan">
        <VillaPriceInclusionPicker
          items={priceInclusionItems}
          selectedIds={villa.priceInclusionIds}
        />
      </Section>

      <Section title="Vitrin Yönetimi">
        <VillaShowcaseManagement villa={villa} />
      </Section>
    </div>
  );
}
