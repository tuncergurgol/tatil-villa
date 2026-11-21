import { redirect } from "next/navigation";
import { getVillaTakvimPageData } from "@/lib/queries/villa-takvim";
import { villaTakvimPath } from "@/lib/villa-takvim-path";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ villaId: string }>;
}

export default async function VillaTakvimRedirectPage({ params }: PageProps) {
  const { villaId } = await params;
  const data = await getVillaTakvimPageData(villaId);

  if (data.selected?.villa) {
    redirect(villaTakvimPath(data.selected.villa));
  }

  redirect(villaTakvimPath(villaId));
}
