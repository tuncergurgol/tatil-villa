import { notFound, redirect } from "next/navigation";
import VillaEditForm from "@/components/admin/villas/VillaEditForm";
import { getVillaEditPageData } from "@/lib/queries/villa-edit";
import {
  findVillaByRouteParam,
  villaAdminEditPath,
} from "@/lib/villa-admin-path";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVillaPage({ params }: PageProps) {
  const { id: routeId } = await params;
  const routeVilla = await findVillaByRouteParam(routeId);

  if (!routeVilla) notFound();

  const canonicalPath = villaAdminEditPath(routeVilla);
  if (`/admin/villalar/${routeId}/duzenle` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const data = await getVillaEditPageData(routeVilla.id);

  if (!data.villa || !data.icalData) notFound();

  return (
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
  );
}
