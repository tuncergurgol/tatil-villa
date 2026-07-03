import VillaTakvimPage from "@/components/admin/villas/periods/VillaTakvimPage";
import { getVillaTakvimPageData } from "@/lib/queries/villa-takvim";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ villa?: string }>;
}

export default async function TakvimPage({ searchParams }: PageProps) {
  const { villa: villaId } = await searchParams;
  const data = await getVillaTakvimPageData(villaId);

  return (
    <VillaTakvimPage
      villas={data.villas}
      selected={data.selected}
      selectedVillaId={villaId}
    />
  );
}
