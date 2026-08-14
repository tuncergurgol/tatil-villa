import { notFound, redirect } from "next/navigation";
import VillaHizliFiyatPage from "@/components/admin/villas/periods/VillaHizliFiyatPage";
import { getVillaPeriodPageData } from "@/lib/queries/villa-periods";
import { villaAdminHizliFiyatPath } from "@/lib/villa-admin-path";
import { findVillaByRouteParam } from "@/lib/villa-admin-path.server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HizliFiyatRoutePage({ params }: PageProps) {
  const { id: routeId } = await params;
  const routeVilla = await findVillaByRouteParam(routeId);

  if (!routeVilla) notFound();

  const canonicalPath = villaAdminHizliFiyatPath(routeVilla);
  if (`/admin/hizlifiyat/${routeId}` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const data = await getVillaPeriodPageData(routeVilla.id);
  if (!data) notFound();

  return (
    <VillaHizliFiyatPage
      villa={data.villa}
      periods={data.periods}
      routeVilla={routeVilla}
    />
  );
}
