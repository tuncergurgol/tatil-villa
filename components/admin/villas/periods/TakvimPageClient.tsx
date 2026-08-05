"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TakvimVillaGrid from "@/components/admin/villas/periods/TakvimVillaGrid";
import VillaTakvimSelectedClient from "@/components/admin/villas/periods/VillaTakvimSelectedClient";

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
