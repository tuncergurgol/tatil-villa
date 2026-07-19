"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  getAvailabilitySearchPageData,
  searchAvailability,
  type AvailabilitySearchFilters,
  type AvailabilitySearchResultItem,
  type AvailabilitySearchSort,
} from "@/lib/queries/availability-search";
import { resolveVillaStayQuote } from "@/lib/queries/villa-stay-quote";
import type { StayQuote } from "@/lib/stay-quote";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { sendCustomerNotificationWhatsApp } from "@/lib/whatsapp-delivery";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import {
  PUBLIC_SITE_KEYS,
  PUBLIC_SITE_META,
} from "@/lib/public-site-keys";
import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";

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

    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const pricing = await resolveVillaStayQuote(
          result.id,
          result.checkIn,
          result.checkOut
        );
        return {
          ...result,
          pricingContext: pricing
            ? {
                periodFees: pricing.periodFees,
                heatedPools: pricing.heatedPools,
                baseCapacity: pricing.baseCapacity,
              }
            : undefined,
        };
      })
    );

    return { success: true, results: enrichedResults };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Uygunluk araması başarısız",
    };
  }
}

const stayQuoteSchema = z.object({
  villaId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
});

export async function resolveAvailabilityStayQuoteAction(input: {
  villaId: string;
  checkIn: string;
  checkOut: string;
}): Promise<{
  quote?: StayQuote;
  pricingContext?: AvailabilitySearchResultItem["pricingContext"];
  error?: string;
}> {
  await requireAdmin();

  const parsed = stayQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Geçersiz tarih aralığı" };
  }

  try {
    const resolved = await resolveVillaStayQuote(
      parsed.data.villaId,
      parsed.data.checkIn,
      parsed.data.checkOut
    );
    if (!resolved?.quote.valid) {
      return {
        error: resolved?.quote.invalidReason ?? "Bu tarihler için fiyat yok",
      };
    }
    return {
      quote: resolved.quote,
      pricingContext: {
        periodFees: resolved.periodFees,
        heatedPools: resolved.heatedPools,
        baseCapacity: resolved.baseCapacity,
      },
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Fiyat hesaplanamadı",
    };
  }
}

const publicShareLinkSchema = z.object({
  villaIds: z.array(z.string().min(1)).min(1).max(500),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.coerce.number().int().min(1).max(50).default(2),
});

export async function createPublicVillaShareLinkAction(input: {
  villaIds: string[];
  checkIn: string;
  checkOut: string;
  adults: number;
}): Promise<{ url?: string; error?: string }> {
  await requireAdmin();

  const parsed = publicShareLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz link bilgisi" };
  }

  const villaIds = [...new Set(parsed.data.villaIds)];
  const existingVillaCount = await prisma.villa.count({
    where: { id: { in: villaIds }, active: true },
  });
  if (existingVillaCount !== villaIds.length) {
    return { error: "Seçilen villalardan biri artık yayında değil" };
  }

  try {
    const share = await prisma.publicVillaShareLink.create({
      data: {
        code: randomBytes(6).toString("hex"),
        villaIds,
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
        adults: parsed.data.adults,
      },
      select: { code: true },
    });

    const domain = sanitizePublicBookingDomain("www.tatildeyiz.com.tr");
    return {
      url: `https://${domain}/teklif/${share.code}`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Kısa teklif bağlantısı oluşturulamadı",
    };
  }
}

const availabilityOfferSchema = z.object({
  villaId: z.string().min(1),
  channel: z.enum(["WHATSAPP", "EMAIL", "SMS"]),
  siteKey: z.enum(PUBLIC_SITE_KEYS),
  guestName: z.string().trim().max(150).default(""),
  guestPhone: z.string().trim().max(30).default(""),
  guestEmail: z.string().trim().max(254).default(""),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.coerce.number().int().min(0).max(50).default(2),
  children: z.coerce.number().int().min(0).max(50).default(0),
  babies: z.coerce.number().int().min(0).max(50).default(0),
  linkType: z.enum(["DETAILED", "VILLA_ONLY"]),
  grandTotal: z.coerce.number().min(0).optional(),
});

export async function sendAvailabilityOfferAction(input: {
  villaId: string;
  channel: "WHATSAPP" | "EMAIL" | "SMS";
  siteKey: (typeof PUBLIC_SITE_KEYS)[number];
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  babies: number;
  linkType: "DETAILED" | "VILLA_ONLY";
  grandTotal?: number;
}): Promise<{ success?: boolean; error?: string; message?: string }> {
  await requireAdmin();

  const parsed = availabilityOfferSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz gönderim bilgisi" };
  }

  const data = parsed.data;
  const villa = await prisma.villa.findUnique({
    where: { id: data.villaId },
    select: { name: true, slug: true },
  });
  if (!villa) return { error: "Villa bulunamadı" };

  const site = PUBLIC_SITE_META[data.siteKey];
  const domain = sanitizePublicBookingDomain(site.domain);
  const params = new URLSearchParams();
  if (data.linkType === "DETAILED") {
    params.set("checkIn", data.checkIn);
    params.set("checkOut", data.checkOut);
    params.set("adults", String(Math.max(1, data.adults)));
  }
  const query = params.toString();
  const url = `https://${domain}/${villa.slug}${query ? `?${query}` : ""}`;

  const quote = await resolveVillaStayQuote(
    data.villaId,
    data.checkIn,
    data.checkOut
  );
  if (data.linkType === "DETAILED" && !quote?.quote.valid) {
    return {
      error: quote?.quote.invalidReason ?? "Seçilen tarihler için fiyat hesaplanamadı",
    };
  }

  const total = data.grandTotal ?? quote?.quote.total ?? 0;
  const nights = quote?.quote.nights ?? 0;
  const lines = [
    data.guestName ? `Merhaba ${data.guestName},` : "Merhaba,",
    "",
    `${villa.name} için uygunluk / teklif bilgisi:`,
    data.linkType === "DETAILED" ? `Giriş: ${data.checkIn}` : null,
    data.linkType === "DETAILED" ? `Çıkış: ${data.checkOut}` : null,
    data.linkType === "DETAILED" && nights > 0 ? `Gece: ${nights}` : null,
    data.linkType === "DETAILED" && total > 0
      ? `Toplam: ${total.toLocaleString("tr-TR")} TL`
      : null,
    "",
    url,
    "",
    site.label,
  ];
  const message = lines.filter((line) => line != null).join("\n");

  if (data.channel === "WHATSAPP") {
    if (!data.guestPhone) return { error: "Müşteri telefonu gerekli" };
    const sent = await sendCustomerNotificationWhatsApp(
      data.guestPhone,
      message
    );
    return sent.ok
      ? { success: true, message: "WhatsApp mesajı gönderildi" }
      : { error: sent.error ?? "WhatsApp mesajı gönderilemedi" };
  }

  if (data.channel === "EMAIL") {
    if (!data.guestEmail) return { error: "Müşteri e-posta adresi gerekli" };
    try {
      const company = await getCompanySettings();
      await sendCompanyMail(company, {
        to: data.guestEmail,
        fromEmail: "rezervasyon@tatildeyiz.com.tr",
        fromName: site.label,
        replyTo: "rezervasyon@tatildeyiz.com.tr",
        subject: `${villa.name} uygunluk teklifi`,
        text: message,
        html: toHtmlFromText(message, ""),
      });
      return { success: true, message: "E-posta gönderildi" };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "E-posta gönderilemedi",
      };
    }
  }

  // SMS kanalı ve payload'ı hazır; sağlayıcı bağlandığında burada teslim edilir.
  return {
    error: "SMS gönderim altyapısı hazır; SMS sağlayıcısı henüz bağlı değil",
  };
}
