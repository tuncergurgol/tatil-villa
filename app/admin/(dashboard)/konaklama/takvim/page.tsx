import { redirect } from "next/navigation";
import TakvimSelectedClientLoader from "@/components/admin/villas/periods/TakvimSelectedClientLoader";
import TakvimVillaGrid from "@/components/admin/villas/periods/TakvimVillaGrid";
import { getVillaTakvimPageData } from "@/lib/queries/villa-takvim";
import { villaTakvimRouteParam } from "@/lib/villa-takvim-path";

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

  return <TakvimSelectedClientLoader selected={data.selected} />;
}
