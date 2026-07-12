import { prisma } from "@/lib/db";
import { getTurkeyProvinces } from "@/lib/mernis-ilce";
import { getAmenitiesForVillaForm } from "@/lib/queries/amenities";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getFacilityCategoriesForPicker } from "@/lib/queries/facility-categories";
import { getPrepaymentPaymentTypesForPicker } from "@/lib/queries/prepayment-payment-types";
import { getPriceInclusionAdminData } from "@/lib/queries/price-inclusion";
import { getActiveVillaOwners } from "@/lib/queries/villa-owners";
import { getVillaIcalTabData } from "@/lib/queries/villa-ical";
import { getVillaLocationFormData } from "@/lib/queries/villa-location";
import { getVillaRoomsForTab } from "@/lib/queries/villa-rooms";
import { getVillaGalleryImages } from "@/lib/villa-gallery";

function buildRegionBreadcrumb(region: {
  name: string;
  parent: {
    name: string;
    parent: { name: string } | null;
  } | null;
}) {
  return [region.parent?.parent?.name, region.parent?.name, region.name]
    .filter(Boolean)
    .join(", ");
}

export async function getVillaEditPageData(
  villaId: string,
  requestOrigin?: { host?: string | null; protocol?: string | null }
) {
  const [
    villa,
    pools,
    amenityCategories,
    facilityCategories,
    priceInclusion,
    companySettings,
    activeOwners,
    locationData,
    icalData,
    rooms,
    prepaymentPaymentTypes,
  ] = await Promise.all([
    prisma.villa.findUnique({
      where: { id: villaId },
      include: {
        owner: true,
        region: {
          select: {
            name: true,
            parent: {
              select: {
                name: true,
                parent: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.villaPool.findMany({
      where: { villaId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        periods: {
          orderBy: { startDate: "asc" },
        },
      },
    }),
    getAmenitiesForVillaForm(),
    getFacilityCategoriesForPicker(),
    getPriceInclusionAdminData(),
    getCompanySettings(),
    getActiveVillaOwners(),
    getVillaLocationFormData(villaId),
    getVillaIcalTabData(villaId, requestOrigin),
    getVillaRoomsForTab(villaId),
    getPrepaymentPaymentTypesForPicker(),
  ]);

  const previewDomain =
    companySettings.domain.replace(/^www\./, "") || "tatildeyiz.com.tr";

  return {
    villa,
    pools,
    amenityCategories,
    facilityCategories,
    priceInclusionItems: priceInclusion.items,
    previewDomain,
    activeOwners,
    provinces: getTurkeyProvinces(),
    locationRegions: locationData.regions,
    surroundingLocations: locationData.surroundingLocations,
    distanceByLocationId: Object.fromEntries(locationData.distanceByLocationId),
    icalData,
    galleryImages: villa ? getVillaGalleryImages(villa) : [],
    rooms,
    prepaymentPaymentTypes,
    regionBreadcrumb: villa?.region
      ? buildRegionBreadcrumb(villa.region)
      : "",
  };
}
