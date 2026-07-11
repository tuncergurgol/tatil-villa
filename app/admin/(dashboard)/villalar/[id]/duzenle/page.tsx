import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import VillaEditForm from "@/components/admin/villas/VillaEditForm";
import { getVillaEditPageData } from "@/lib/queries/villa-edit";
import { villaAdminEditPath } from "@/lib/villa-admin-path";
import { findVillaByRouteParam } from "@/lib/villa-admin-path.server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function VillaEditFormFallback() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
      Yükleniyor...
    </div>
  );
}

export default async function EditVillaPage({ params }: PageProps) {
  const { id: routeId } = await params;
  const routeVilla = await findVillaByRouteParam(routeId);

  if (!routeVilla) notFound();

  const canonicalPath = villaAdminEditPath(routeVilla);
  if (`/admin/villalar/${routeId}/duzenle` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const data = await getVillaEditPageData(routeVilla.id, {
    host: (await headers()).get("host"),
    protocol: (await headers()).get("x-forwarded-proto"),
  });

  if (!data.villa || !data.icalData) notFound();

  return (
    <Suspense fallback={<VillaEditFormFallback />}>
      <VillaEditForm
        villa={data.villa}
        pools={data.pools}
        amenityCategories={data.amenityCategories}
        facilityCategories={data.facilityCategories}
        priceInclusionItems={data.priceInclusionItems}
        previewDomain={data.previewDomain}
        activeOwners={data.activeOwners}
        provinces={data.provinces}
        locationRegions={data.locationRegions}
        surroundingLocations={data.surroundingLocations}
        distanceByLocationId={data.distanceByLocationId}
        icalData={data.icalData}
        galleryImages={data.galleryImages}
        rooms={data.rooms}
        prepaymentPaymentTypes={data.prepaymentPaymentTypes}
        regionBreadcrumb={data.regionBreadcrumb}
      />
    </Suspense>
  );
}
