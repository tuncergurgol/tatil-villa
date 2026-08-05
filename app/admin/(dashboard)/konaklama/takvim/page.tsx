import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import TakvimVillaGrid from "@/components/admin/villas/periods/TakvimVillaGrid";
import { getVillaTakvimPageData } from "@/lib/queries/villa-takvim";
import { villaTakvimRouteParam } from "@/lib/villa-takvim-path";

const VillaTakvimSelectedView = nextDynamic(
  () => import("@/components/admin/villas/periods/VillaTakvimSelectedView"),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Takvim yükleniyor…
      </div>
    ),
  }
);

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ villa?: string; q?: string }>;
}

export default async function TakvimPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const villaParam = params.villa;
  const data = await getVillaTakvimPageData(villaParam);

  if (villaParam && data.selected?.villa) {
    const canonical = villaTakvimRouteParam(data.selected.villa);
    if (villaParam !== canonical) {
      const next = new URLSearchParams();
      next.set("villa", canonical);
      if (params.q) next.set("q", params.q);
      redirect(`/admin/konaklama/takvim?${next.toString()}`);
    }
  }

  if (!data.selected) {
    return <TakvimVillaGrid villas={data.villas} />;
  }

  return <VillaTakvimSelectedView villas={data.villas} selected={data.selected} />;
}
