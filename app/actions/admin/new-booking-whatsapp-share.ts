"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  appendBookingSiteFooter,
  sanitizePublicBookingDomain,
} from "@/lib/booking-site-brand";
import { prisma } from "@/lib/db";
import {
  buildNewBookingWhatsAppShareMessage,
  type NewBookingWhatsAppSharePayload,
} from "@/lib/new-booking-whatsapp-share";
import { isValidWhatsAppPhoneE164, normalizePhoneToE164 } from "@/lib/phone";
import { getPublicSiteMeta, isPublicSiteKey } from "@/lib/public-site-keys";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  appendUndocumentedBookingAccessParam,
  createUndocumentedVillaBookingAccessToken,
} from "@/lib/undocumented-villa-booking-access";
import { hasVillaTourismDocument } from "@/lib/villa-document-types";
import { villaPublicPath } from "@/lib/villa-public-path";
import { sendCustomerNotificationWhatsApp } from "@/lib/whatsapp-delivery";

const shareSchema = z.object({
  phone: z.string().min(1, "WhatsApp numarası gerekli"),
  villaId: z.string().trim().min(1).nullable().optional(),
  siteKey: z
    .string()
    .trim()
    .refine((value) => isPublicSiteKey(value), "Geçersiz site")
    .optional(),
  villaName: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0).default(0),
  babies: z.coerce.number().int().min(0).default(0),
  accommodationTotal: z.number().nullable(),
  ownerDiscountAmount: z.number().nullable().optional(),
  agencyDiscountAmount: z.number().nullable().optional(),
  cleaningFee: z.number().nullable().optional(),
  underfloorHeatingFee: z.number().nullable().optional(),
  reservationTotal: z.number().nullable(),
  prepaymentAmount: z.number().nullable(),
  prepaymentRate: z.number(),
  entrancePayment: z.number().nullable(),
  damageDeposit: z.number().nullable().optional(),
  guestName: z.string().nullable().optional(),
});

export type ShareNewBookingWhatsAppResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

/** Uygunluk teklifiyle aynı yapıda public villa bağlantısı (tarih + kişi + rez). */
async function buildShareVillaUrl(input: {
  villaId?: string | null;
  villaName: string;
  siteKey?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
}): Promise<string | null> {
  // villaId eski admin sekmesinden gelmeyebilir; villa adıyla da bulunur.
  const villa = input.villaId
    ? await prisma.villa.findUnique({
        where: { id: input.villaId },
        select: { id: true, slug: true, documentNo: true, documentType: true },
      })
    : await prisma.villa.findFirst({
        where: { name: input.villaName.trim(), active: true },
        select: { id: true, slug: true, documentNo: true, documentType: true },
        orderBy: { createdAt: "desc" },
      });
  if (!villa?.slug) return null;

  const domain = sanitizePublicBookingDomain(
    getPublicSiteMeta(input.siteKey ?? "tatildeyiz").domain
  );
  const params = new URLSearchParams();
  params.set("checkIn", input.checkIn);
  params.set("checkOut", input.checkOut);
  params.set("adults", String(Math.max(1, input.adults)));

  const url = `https://${domain}${villaPublicPath(villa.slug)}?${params.toString()}`;
  if (hasVillaTourismDocument(villa)) return url;

  return appendUndocumentedBookingAccessParam(
    url,
    createUndocumentedVillaBookingAccessToken(villa.id)
  );
}

export async function shareNewBookingQuoteWhatsAppAction(
  payload: NewBookingWhatsAppSharePayload & { phone: string; siteKey?: string }
): Promise<ShareNewBookingWhatsAppResult> {
  await requireAdmin();

  const parsed = shareSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz paylaşım bilgisi",
    };
  }

  const data = parsed.data;
  const e164 = normalizePhoneToE164(data.phone);
  if (!e164 || !isValidWhatsAppPhoneE164(e164)) {
    return { error: "Geçerli bir WhatsApp numarası girin" };
  }

  if (!data.reservationTotal || data.reservationTotal <= 0) {
    return { error: "Paylaşmak için geçerli bir fiyat özeti gerekli" };
  }

  const villaUrl = await buildShareVillaUrl({
    villaId: data.villaId,
    villaName: data.villaName,
    siteKey: data.siteKey,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    adults: data.adults,
  });

  const company = await getCompanySettings();
  const body = buildNewBookingWhatsAppShareMessage(data, villaUrl);
  const message = appendBookingSiteFooter(
    body,
    company.brandName || "Tatildeyiz"
  );

  const sent = await sendCustomerNotificationWhatsApp(e164, message);
  if (!sent.ok) {
    return { error: sent.error ?? "WhatsApp mesajı gönderilemedi" };
  }

  return { success: true, message: "WhatsApp mesajı gönderildi" };
}
