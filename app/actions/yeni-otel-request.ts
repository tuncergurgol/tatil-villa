"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyNewCallbackRequest } from "@/lib/callback-request-notify";
import {
  CUSTOMER_BLACKLIST_PUBLIC_MESSAGE,
  isBlacklistedContact,
} from "@/lib/customer-blacklist";
import { syncCustomerFromCallback } from "@/lib/customer-crm";
import {
  formatTry,
  nightsBetween,
  quoteStay,
  YENI_OTELLER,
} from "@/lib/yeni-otel/catalog";
import { isValidTurkishPhoneE164, normalizePhoneToE164 } from "@/lib/phone";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

const schema = z.object({
  hotelSlug: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  boardId: z.string().trim().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(12),
  children: z.number().int().min(0).max(8),
  roomCount: z.number().int().min(1).max(4),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "E-posta geçersiz",
    }),
  note: z.string().trim().max(1000),
});

export type YeniOtelRequestState = {
  success?: boolean;
  error?: string;
};

export async function submitYeniOtelRequest(
  input: z.infer<typeof schema>
): Promise<YeniOtelRequestState> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: "Rezervasyon bilgilerini kontrol edin." };
  }

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  if (site.key !== "tatildeyiz") {
    return { error: "Bu sayfa yalnızca tatildeyiz.com.tr üzerinde açıktır." };
  }

  const data = parsed.data;
  const hotel = YENI_OTELLER.find((item) => item.slug === data.hotelSlug);
  const room = hotel?.rooms.find((item) => item.id === data.roomId);
  const board = hotel?.boards.find((item) => item.id === data.boardId);
  const nights = nightsBetween(data.checkIn, data.checkOut);
  const guests = data.adults + data.children;

  if (!hotel || !room || !board) {
    return { error: "Seçilen oda bulunamadı." };
  }
  if (nights < 1 || nights > 30) {
    return { error: "Konaklama 1 ile 30 gece arasında olmalıdır." };
  }
  if (guests > room.maxGuests * data.roomCount) {
    return { error: "Seçilen oda bu kişi sayısı için uygun değil." };
  }

  const phone = normalizePhoneToE164(data.phone);
  if (!isValidTurkishPhoneE164(phone)) {
    return { error: "Geçerli bir Türkiye telefon numarası girin." };
  }
  if (await isBlacklistedContact({ phone })) {
    return { error: CUSTOMER_BLACKLIST_PUBLIC_MESSAGE };
  }

  const quote = quoteStay({
    room,
    board,
    checkIn: data.checkIn,
    nights,
    adults: data.adults,
    roomCount: data.roomCount,
  });

  const note = [
    "Yeni otel rezervasyon talebi",
    `Tesis: ${hotel.name}`,
    `Oda: ${room.name}`,
    `Konsept: ${board.label}`,
    `Giriş: ${data.checkIn}`,
    `Çıkış: ${data.checkOut}`,
    `Gece: ${nights}`,
    `Misafir: ${data.adults} yetişkin, ${data.children} çocuk, ${data.roomCount} oda`,
    data.email ? `E-posta: ${data.email}` : "",
    `Örnek tutar: ${formatTry(quote.total)}`,
    data.note ? `Not: ${data.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const item = await prisma.callbackRequest.create({
    data: {
      name: data.name,
      phone,
      note,
      preferredDay: "ANY",
      preferredTime: "ASAP",
      status: "PENDING",
      sourceSite: "yeni-otel",
      sourceDomain: site.domain,
    },
  });

  await syncCustomerFromCallback({
    name: data.name,
    phone,
    firstContactAt: item.createdAt,
  });
  try {
    await notifyNewCallbackRequest(item);
  } catch (error) {
    console.error("Yeni otel talebi bildirimi gönderilemedi", error);
  }

  return { success: true };
}
