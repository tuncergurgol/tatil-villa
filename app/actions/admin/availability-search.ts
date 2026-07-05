"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  getAvailabilitySearchPageData,
  searchAvailability,
  type AvailabilitySearchFilters,
  type AvailabilitySearchResultItem,
  type AvailabilitySearchSort,
} from "@/lib/queries/availability-search";

const searchFiltersSchema = z.object({
  phone: z.string().min(1, "Telefon numarası zorunlu"),
  guestName: z.string().min(1, "Ad soyad zorunlu"),
  guestEmail: z.string().optional(),
  contactChannelId: z.string().min(1, "Ulaşım kanalı zorunlu"),
  checkIn: z.string().min(1, "Giriş tarihi gerekli"),
  checkOut: z.string().min(1, "Çıkış tarihi gerekli"),
  adults: z.coerce.number().min(0).default(2),
  children: z.coerce.number().min(0).default(0),
  babies: z.coerce.number().min(0).default(0),
  budgetMin: z
    .union([z.number(), z.null()])
    .optional()
    .transform((value) => (value && value > 0 ? value : null)),
  budgetMax: z
    .union([z.number(), z.null()])
    .optional()
    .transform((value) => (value && value > 0 ? value : null)),
  regionSlugs: z.array(z.string()).default([]),
  amenityNames: z.array(z.string()).default([]),
  guestCounts: z.array(z.coerce.number()).default([]),
  flexibleDate: z.boolean().default(false),
  fillEmptyDates: z.boolean().default(false),
  sort: z.enum(["recommended", "price_asc"]).default("recommended"),
});

export type AvailabilitySearchActionState = {
  success?: boolean;
  error?: string;
  results?: AvailabilitySearchResultItem[];
};

export async function getAvailabilitySearchPageDataAction() {
  await requireAdmin();
  return getAvailabilitySearchPageData();
}

export async function searchAvailabilityAction(
  filters: AvailabilitySearchFilters
): Promise<AvailabilitySearchActionState> {
  await requireAdmin();

  const parsed = searchFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz arama filtreleri",
    };
  }

  try {
    console.info("[availability-search]", {
      at: new Date().toISOString(),
      guestName: parsed.data.guestName,
      contactChannelId: parsed.data.contactChannelId,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      adults: parsed.data.adults,
      children: parsed.data.children,
      babies: parsed.data.babies,
      regionSlugs: parsed.data.regionSlugs,
      amenityNames: parsed.data.amenityNames,
      guestCounts: parsed.data.guestCounts,
      flexibleDate: parsed.data.flexibleDate,
      fillEmptyDates: parsed.data.fillEmptyDates,
      sort: parsed.data.sort,
    });

    const results = await searchAvailability({
      ...parsed.data,
      sort: parsed.data.sort as AvailabilitySearchSort,
    });

    return { success: true, results };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Uygunluk araması başarısız",
    };
  }
}
