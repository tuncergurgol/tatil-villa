"use client";

import nextDynamic from "next/dynamic";
import type { VillaTakvimSearchItem } from "@/lib/queries/villa-takvim";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";

const VillaTakvimSelectedView = nextDynamic(
  () => import("@/components/admin/villas/periods/VillaTakvimSelectedView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Takvim yükleniyor…
      </div>
    ),
  }
);

type Props = {
  selected: {
    villa: VillaTakvimSearchItem;
    periods: VillaPricePeriodItem[];
    periodDays: VillaPricePeriodDayItem[];
  };
};

export default function TakvimSelectedClientLoader({ selected }: Props) {
  return <VillaTakvimSelectedView selected={selected} />;
}
