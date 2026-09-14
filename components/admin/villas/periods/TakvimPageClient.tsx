"use client";

import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const TakvimVillaGrid = nextDynamic(
  () => import("@/components/admin/villas/periods/TakvimVillaGrid"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Tesisler yükleniyor…
      </div>
    ),
  }
);

const VillaTakvimSelectedClient = nextDynamic(
  () => import("@/components/admin/villas/periods/VillaTakvimSelectedClient"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Takvim yükleniyor…
      </div>
    ),
  }
);

function TakvimPageInner() {
  const searchParams = useSearchParams();
  const villaParam = searchParams.get("villa");

  if (villaParam) {
    return <VillaTakvimSelectedClient villaParam={villaParam} />;
  }

  return <TakvimVillaGrid />;
}

export default function TakvimPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Yükleniyor…
        </div>
      }
    >
      <TakvimPageInner />
    </Suspense>
  );
}
