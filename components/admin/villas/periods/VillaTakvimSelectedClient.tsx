"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VillaTakvimSelectedView from "@/components/admin/villas/periods/VillaTakvimSelectedView";
import type { VillaTakvimSearchItem } from "@/lib/queries/villa-takvim";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";

type SelectedPayload = {
  villa: VillaTakvimSearchItem;
  periods: VillaPricePeriodItem[];
  periodDays: VillaPricePeriodDayItem[];
};

type Props = {
  villaParam: string;
};

export default function VillaTakvimSelectedClient({ villaParam }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelected(null);

    fetch(
      `/api/admin/konaklama/takvim-data?villa=${encodeURIComponent(villaParam)}`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Takvim verisi alınamadı");
        }
        if (data.redirectTo) {
          router.replace(data.redirectTo);
          return;
        }
        setSelected(data.selected ?? null);
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name === "AbortError") return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Takvim verisi alınamadı"
        );
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [router, villaParam]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Takvim yükleniyor…
      </div>
    );
  }

  if (error || !selected) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-gray-600">
        <p>{error ?? "Villa takvimi bulunamadı."}</p>
        <button
          type="button"
          onClick={() => router.push("/admin/konaklama/takvim")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Tüm Tesislere Dön
        </button>
      </div>
    );
  }

  return <VillaTakvimSelectedView selected={selected} />;
}
