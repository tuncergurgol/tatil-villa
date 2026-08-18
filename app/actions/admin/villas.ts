"use server";

import { revalidatePath } from "next/cache";
import { SalesType, VillaCategory } from "@prisma/client";
import {
  mergeFacilityCategoryNames,
  resolveFacilityCategoryNamesForAmenities,
} from "@/lib/amenity-facility-links";
import { normalizeOwnerPhone } from "@/lib/villa-owner-utils";
import { syncVillaRooms } from "@/lib/queries/villa-rooms";
import { RegionLevel } from "@/lib/region-levels";
import { DEFAULT_PREPAYMENT_PAYMENT_TYPE_ID } from "@/lib/villa-rules-defaults";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import { villaAdminEditPath } from "@/lib/villa-admin-path";
import { villaPublicPath } from "@/lib/villa-public-path";
import {
  buildVillaSlugFromName,
  ensureUniqueVillaSlug,
  resolveVillaSlugForName,
} from "@/lib/villa-slug";
import { cloneVilla } from "@/lib/villa-clone";
import { normalizeVillaDescriptionForStorage } from "@/lib/villa-html-content";
import {
  allocateNextVillaId,
  assignMissingVillaNumericIds,
} from "@/lib/villa-numeric-id";

function readDescription(formData: FormData): string {
  return normalizeVillaDescriptionForStorage(
    String(formData.get("description") ?? "")
  );
}

function parseBool(value: FormDataEntryValue | null) {
  return value === "true" || value === "on";
}

function parseIntField(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function assertMahalleRegion(regionId: string) {
  const region = await prisma.region.findUnique({
    where: { id: regionId },
    select: { level: true, active: true },
  });

  if (!region || !region.active) {
    throw new Error("Geçerli bir bölge seçin");
  }

  if (region.level !== RegionLevel.MAHALLE) {
    throw new Error("Villa yalnızca mahalle seviyesindeki bir bölgeye atanabilir");
  }
}

export async function createVillaFromGeneral(
  formData: FormData
): Promise<
  | { success: true; editPath: string }
  | { success: false; error: string }
> {
  try {
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return { success: false, error: "Villa adı zorunludur" };
    }

    const fallbackRegion = await prisma.region.findFirst({
      where: { level: RegionLevel.MAHALLE, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true },
    });
    if (!fallbackRegion) {
      return {
        success: false,
        error: "Villa oluşturmak için aktif bir mahalle kaydı bulunamadı",
      };
    }

    const baseSlug = buildVillaSlugFromName(name);
    const slug = await ensureUniqueVillaSlug(baseSlug);
    const salesType = String(
      formData.get("salesType") ?? "komisyon"
    ) as SalesType;

    await assignMissingVillaNumericIds();

    const villa = await prisma.$transaction(async (tx) => {
      const villaId = await allocateNextVillaId(tx);
      return tx.villa.create({
        data: {
          villaId,
          slug,
          name,
          originalName: String(formData.get("originalName") ?? "").trim(),
          category:
            (formData.get("category") as VillaCategory) || VillaCategory.villa,
          regionId: fallbackRegion.id,
          location: "",
          guests: parseIntField(formData.get("guests"), 1),
          extraCapacity: parseIntField(formData.get("extraCapacity"), 0),
          livingRooms: parseIntField(formData.get("livingRooms"), 0),
          bedrooms: parseIntField(formData.get("bedrooms"), 1),
          bathrooms: parseIntField(formData.get("bathrooms"), 1),
          image: "",
          images: [],
          description: readDescription(formData),
          amenities: [],
          facilityCategories: [],
          salesType:
            salesType === SalesType.garanti
              ? SalesType.garanti
              : SalesType.komisyon,
          active: parseBool(formData.get("active")),
          showInSearch: parseBool(formData.get("showInSearch")),
          showInOffer: parseBool(formData.get("showInOffer")),
          ribbonText1: String(formData.get("ribbonText1") ?? ""),
          ribbonText2: String(formData.get("ribbonText2") ?? ""),
        },
        select: { id: true, villaId: true },
      });
    });

    await syncVillaRooms(villa.id);
    revalidatePath("/admin/villalar");

    return {
      success: true,
      editPath: villaAdminEditPath(villa),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Villa oluşturulamadı",
    };
  }
}

export async function createVilla(formData: FormData) {
  await requireAdmin();

  const regionId = formData.get("regionId") as string;
  await assertMahalleRegion(regionId);
  const imagesRaw = (formData.get("images") as string) || "";
  const amenities = formData
    .getAll("amenities")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const facilityCategoriesFromForm = formData
    .getAll("facilityCategories")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const linkedFacilityCategories =
    await resolveFacilityCategoryNamesForAmenities(amenities);
  const facilityCategories = mergeFacilityCategoryNames(
    facilityCategoriesFromForm,
    linkedFacilityCategories
  );

  await prisma.$transaction(async (tx) => {
    const villaId = await allocateNextVillaId(tx);
    await tx.villa.create({
      data: {
        villaId,
        slug: formData.get("slug") as string,
        name: formData.get("name") as string,
        category: (formData.get("category") as VillaCategory) || VillaCategory.villa,
        regionId,
        location: formData.get("location") as string,
        guests: parseInt(formData.get("guests") as string, 10),
        bedrooms: parseInt(formData.get("bedrooms") as string, 10),
        bathrooms: parseInt(formData.get("bathrooms") as string, 10),
        pricePerNight: formData.get("pricePerNight")
          ? parseInt(formData.get("pricePerNight") as string, 10)
          : null,
        image: formData.get("image") as string,
        images: imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean),
        description: readDescription(formData),
        amenities,
        facilityCategories,
        featured: formData.get("featured") === "on",
        popular: formData.get("popular") === "on",
        deal: formData.get("deal") === "on",
        recommended: true,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/villalar");
  revalidatePath("/admin/villalar");
}

export async function updateVilla(id: string, formData: FormData) {
  await requireAdmin();

  const regionId = formData.get("regionId") as string;
  await assertMahalleRegion(regionId);

  const imagesRaw = (formData.get("images") as string) || "";
  const amenities = formData
    .getAll("amenities")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const facilityCategoriesFromForm = formData
    .getAll("facilityCategories")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const linkedFacilityCategories =
    await resolveFacilityCategoryNamesForAmenities(amenities);
  const facilityCategories = mergeFacilityCategoryNames(
    facilityCategoriesFromForm,
    linkedFacilityCategories
  );

  await prisma.villa.update({
    where: { id },
    data: {
      slug: formData.get("slug") as string,
      name: formData.get("name") as string,
      category: (formData.get("category") as VillaCategory) || VillaCategory.villa,
      regionId: formData.get("regionId") as string,
      location: formData.get("location") as string,
      guests: parseInt(formData.get("guests") as string, 10),
      bedrooms: parseInt(formData.get("bedrooms") as string, 10),
      bathrooms: parseInt(formData.get("bathrooms") as string, 10),
      pricePerNight: formData.get("pricePerNight")
        ? parseInt(formData.get("pricePerNight") as string, 10)
        : null,
      image: formData.get("image") as string,
      images: imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean),
      description: readDescription(formData),
      amenities,
      facilityCategories,
      featured: formData.get("featured") === "on",
      popular: formData.get("popular") === "on",
      deal: formData.get("deal") === "on",
      recommended: formData.get("recommended") === "on",
    },
  });

  revalidatePath("/");
  revalidatePath("/villalar");
  revalidatePath("/admin/villalar");
}

export async function updateVillaGeneral(
  id: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return { success: false, error: "Villa adı zorunludur" };
    }

    const existing = await prisma.villa.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!existing) {
      return { success: false, error: "Villa bulunamadı" };
    }

    const slug = await resolveVillaSlugForName(name, id);

    const salesType = String(
      formData.get("salesType") ?? "komisyon"
    ) as SalesType;

    const updated = await prisma.villa.update({
      where: { id },
      data: {
        name,
        slug,
        originalName: String(formData.get("originalName") ?? ""),
        category:
          (formData.get("category") as VillaCategory) || VillaCategory.villa,
        guests: parseIntField(formData.get("guests"), 1),
        extraCapacity: parseIntField(formData.get("extraCapacity"), 0),
        livingRooms: parseIntField(formData.get("livingRooms"), 0),
        bathrooms: parseIntField(formData.get("bathrooms"), 1),
        bedrooms: parseIntField(formData.get("bedrooms"), 1),
        salesType:
          salesType === SalesType.garanti
            ? SalesType.garanti
            : SalesType.komisyon,
        active: parseBool(formData.get("active")),
        showInSearch: parseBool(formData.get("showInSearch")),
        showInOffer: parseBool(formData.get("showInOffer")),
        ribbonText1: String(formData.get("ribbonText1") ?? ""),
        ribbonText2: String(formData.get("ribbonText2") ?? ""),
        description: readDescription(formData),
      },
      select: { slug: true },
    });

    await syncVillaRooms(id);

    revalidatePath("/admin/villalar");
    await revalidateVillaEditPage(id);
    if (existing.slug && existing.slug !== updated.slug) {
      revalidatePath(villaPublicPath(existing.slug));
      revalidatePath(`/villalar/${existing.slug}`);
    }
    if (updated.slug) {
      revalidatePath(villaPublicPath(updated.slug));
      revalidatePath(`/villalar/${updated.slug}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Kayıt başarısız",
    };
  }
}

export async function updateVillaFeatures(id: string, formData: FormData) {
  await requireAdmin();

  const amenities = formData
    .getAll("amenities")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const facilityCategoriesFromForm = formData
    .getAll("facilityCategories")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const linkedFacilityCategories =
    await resolveFacilityCategoryNamesForAmenities(amenities);
  const facilityCategories = mergeFacilityCategoryNames(
    facilityCategoriesFromForm,
    linkedFacilityCategories
  );
  const priceInclusionIds = formData
    .getAll("priceInclusionIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  await prisma.villa.update({
    where: { id },
    data: {
      amenities,
      facilityCategories,
      priceInclusionIds,
      deal: parseBool(formData.get("deal")),
      popular: parseBool(formData.get("popular")),
      recommended: parseBool(formData.get("recommended")),
      dealSortOrder: parseIntField(formData.get("dealSortOrder"), 99),
      popularSortOrder: parseIntField(formData.get("popularSortOrder"), 99),
      recommendedSortOrder: parseIntField(
        formData.get("recommendedSortOrder"),
        99
      ),
    },
  });

  revalidatePath("/");
  revalidatePath("/villalar");
  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(id);
}

export async function updateVillaMetaSeo(id: string, formData: FormData) {
  await requireAdmin();

  const villa = await prisma.villa.update({
    where: { id },
    data: {
      seoTitle: String(formData.get("seoTitle") ?? "").trim(),
      seoDescription: String(formData.get("seoDescription") ?? "").trim(),
      seoKeywords: String(formData.get("seoKeywords") ?? "").trim(),
    },
    select: { slug: true },
  });

  revalidatePath("/");
  revalidatePath("/villalar");
  revalidatePath(villaPublicPath(villa.slug));
  revalidatePath(`/villalar/${villa.slug}`);
  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(id);
}

export type AssignVillaOwnerState = {
  error?: string;
  success?: boolean;
};

export async function assignVillaOwner(
  villaId: string,
  ownerId: string
): Promise<AssignVillaOwnerState> {
  await requireAdmin();

  const owner = await prisma.villaOwner.findFirst({
    where: { id: ownerId, active: true },
    select: { id: true },
  });

  if (!owner) {
    return { error: "Seçilen villa sahibi bulunamadı veya pasif" };
  }

  await prisma.villa.update({
    where: { id: villaId },
    data: { ownerId },
  });

  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(villaId);
  return { success: true };
}

export async function updateVillaPersonel(id: string, formData: FormData) {
  await requireAdmin();

  await prisma.villa.update({
    where: { id },
    data: {
      greeterName: String(formData.get("greeterName") ?? "").trim(),
      greeterPhone: normalizeOwnerPhone(
        String(formData.get("greeterPhone") ?? "")
      ),
      calendarManagerName: String(
        formData.get("calendarManagerName") ?? ""
      ).trim(),
      calendarManagerPhone: normalizeOwnerPhone(
        String(formData.get("calendarManagerPhone") ?? "")
      ),
    },
  });

  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(id);
}

export async function updateVillaLocation(id: string, formData: FormData) {
  await requireAdmin();

  const regionId = String(formData.get("regionId") ?? "").trim();
  await assertMahalleRegion(regionId);

  const latitude = parseFloat(String(formData.get("latitude") ?? "0"));
  const longitude = parseFloat(String(formData.get("longitude") ?? "0"));

  const distanceEntries: {
    surroundingLocationId: string;
    distanceKm: number;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("distance_")) continue;
    const surroundingLocationId = key.slice("distance_".length);
    const distanceKm = parseFloat(String(value));
    if (
      !surroundingLocationId ||
      !Number.isFinite(distanceKm) ||
      distanceKm < 0
    ) {
      continue;
    }
    distanceEntries.push({ surroundingLocationId, distanceKm });
  }

  await prisma.$transaction([
    prisma.villa.update({
      where: { id },
      data: {
        regionId,
        location: String(formData.get("location") ?? "").trim(),
        latitude: Number.isFinite(latitude) ? latitude : 0,
        longitude: Number.isFinite(longitude) ? longitude : 0,
        videoUrl: String(formData.get("videoUrl") ?? "").trim(),
      },
    }),
    prisma.villaSurroundingDistance.deleteMany({ where: { villaId: id } }),
    ...(distanceEntries.length > 0
      ? [
          prisma.villaSurroundingDistance.createMany({
            data: distanceEntries.map((entry) => ({
              villaId: id,
              ...entry,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/");
  revalidatePath("/villalar");
  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(id);
}

export async function updateVillaRules(id: string, formData: FormData) {
  await requireAdmin();

  const customRules = formData
    .getAll("customRules")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const prepaymentPaymentTypeId =
    String(formData.get("prepaymentPaymentTypeId") ?? "").trim() ||
    DEFAULT_PREPAYMENT_PAYMENT_TYPE_ID;

  await prisma.villa.update({
    where: { id },
    data: {
      prepaymentPaymentTypeId,
      checkInTime: String(formData.get("checkInTime") ?? "16:00"),
      checkOutTime: String(formData.get("checkOutTime") ?? "10:00"),
      allowBaby: parseBool(formData.get("allowBaby")),
      allowChildren: parseBool(formData.get("allowChildren")),
      allowEvents: parseBool(formData.get("allowEvents")),
      allowSmoking: parseBool(formData.get("allowSmoking")),
      allowPets: parseBool(formData.get("allowPets")),
      showNaturePestNotice: parseBool(formData.get("showNaturePestNotice")),
      customRules,
    },
  });

  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(id);
}

export async function deleteVilla(id: string) {
  await requireAdmin();
  await prisma.villa.delete({ where: { id } });
  revalidatePath("/admin/villalar");
  revalidatePath("/villalar");
}

export type CopyVillaResult =
  | { success: true; editPath: string; name: string }
  | { success: false; error: string };

export async function copyVilla(id: string): Promise<CopyVillaResult> {
  try {
    await requireAdmin();

    const created = await cloneVilla(id);

    revalidatePath("/admin/villalar");
    revalidatePath("/villalar");
    await revalidateVillaEditPage(created.id);

    return {
      success: true,
      editPath: villaAdminEditPath(created),
      name: created.name,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Villa kopyalanamadı",
    };
  }
}
