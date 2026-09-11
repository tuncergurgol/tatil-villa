"use client";

import VillaPoolManager, {
  type VillaPoolWithPeriods,
} from "@/components/admin/villas/VillaPoolManager";

interface VillaPoolsTabProps {
  villaId: string;
  pools: VillaPoolWithPeriods[];
}

export default function VillaPoolsTab({ villaId, pools }: VillaPoolsTabProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <VillaPoolManager villaId={villaId} pools={pools} />
    </section>
  );
}
