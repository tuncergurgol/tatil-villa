import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  searchAvailability,
  slimAvailabilitySearchResults,
  type AvailabilitySearchSort,
} from "@/lib/queries/availability-search";
import { syncCustomerFromAvailabilitySearch } from "@/lib/customer-crm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const STAFF_ROLES = new Set(["ADMIN", "SALES_REP"]);

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

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  if (!session?.user || !STAFF_ROLES.has(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const parsed = searchFiltersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz arama filtreleri" },
      { status: 400 }
    );
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
      listScope: "offer",
      sort: parsed.data.sort as AvailabilitySearchSort,
    });

    await syncCustomerFromAvailabilitySearch({
      guestName: parsed.data.guestName,
      phone: parsed.data.phone,
      guestEmail: parsed.data.guestEmail,
    });

    return NextResponse.json({
      success: true,
      results: slimAvailabilitySearchResults(results),
    });
  } catch (error) {
    console.error("[availability-search] failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Uygunluk araması başarısız",
      },
      { status: 500 }
    );
  }
}
