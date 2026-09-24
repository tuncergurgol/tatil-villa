import { notFound, redirect } from "next/navigation";
import VillaHizliFiyatPage from "@/components/admin/villas/periods/VillaHizliFiyatPage";
import { getVillaPeriodPageData } from "@/lib/queries/villa-periods";
import { requireOwnedVilla } from "@/lib/queries/villa-owner-panel";
import {
  villaOwnerEditPath,
  villaOwnerHizliFiyatPath,
} from "@/lib/villa-admin-path";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OwnerHizliFiyatPage({ params }: PageProps) {
  const { id: routeId } = await params;
  const { routeVilla } = await requireOwnedVilla(routeId);
  const canonicalPath = villaOwnerHizliFiyatPath(routeVilla);
  if (`/sahip/villalar/${routeId}/hizlifiyat` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const data = await getVillaPeriodPageData(routeVilla.id);
  if (!data) notFound();

  return (
    <VillaHizliFiyatPage
      villa={data.villa}
      periods={data.periods}
      priceDiscounts={data.priceDiscounts}
      routeVilla={routeVilla}
      links={{
        listHref: "/sahip",
        editHref: villaOwnerEditPath(routeVilla),
        calendarHref: null,
      }}
    />
  );
}
