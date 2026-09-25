import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import VillaEditForm from "@/components/admin/villas/VillaEditForm";
import { getVillaEditPageData } from "@/lib/queries/villa-edit";
import { requireOwnedVilla } from "@/lib/queries/villa-owner-panel";
import { villaOwnerEditPath } from "@/lib/villa-admin-path";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OwnerVillaEditPage({ params }: PageProps) {
  const { id: routeId } = await params;
  const { routeVilla } = await requireOwnedVilla(routeId);
  const canonicalPath = villaOwnerEditPath(routeVilla);
  if (`/admin/sahip/villalar/${routeId}` !== canonicalPath) {
    redirect(canonicalPath);
  }

  const data = await getVillaEditPageData(routeVilla.id, {
    host: (await headers()).get("host"),
    protocol: (await headers()).get("x-forwarded-proto"),
  });
  if (!data.villa || !data.icalData) notFound();

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          Yükleniyor...
        </div>
      }
    >
      <VillaEditForm
        mode="owner"
        villa={data.villa}
        pools={data.pools}
        amenityCategories={data.amenityCategories}
        facilityCategories={data.facilityCategories}
        priceInclusionItems={data.priceInclusionItems}
        previewDomain={data.previewDomain}
        activeOwners={[]}
        provinces={data.provinces}
        locationRegions={data.locationRegions}
        surroundingLocations={data.surroundingLocations}
        distanceByLocationId={data.distanceByLocationId}
        icalData={{
          ...data.icalData,
          sources: [],
          syncEvents: [],
          exportUrl: "",
          externalSyncLinks: data.icalData.externalSyncLinks.map((slot) => ({
            ...slot,
            url: "",
            lastMessage: "",
          })),
          whatsappGroups: [],
          whatsappGroupId: "",
        }}
        galleryImages={data.galleryImages}
        rooms={data.rooms}
        prepaymentPaymentTypes={data.prepaymentPaymentTypes}
        regionBreadcrumb={data.regionBreadcrumb}
      />
    </Suspense>
  );
}
