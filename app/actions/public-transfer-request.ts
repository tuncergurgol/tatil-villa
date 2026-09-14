"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TransferTripDirection, VillaPeriodCurrency } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIp } from "@/lib/request-client-ip";
import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";

export type PublicTransferRequestState = {
  success?: boolean;
  error?: string;
  message?: string;
};

const schema = z.object({
  routeId: z.string().optional().default(""),
  vehicleTypeId: z.string().min(1, "Araç tipi seçin"),
  startPoint: z.string().min(2, "Başlangıç noktası gerekli"),
  endPoint: z.string().min(2, "Bitiş noktası gerekli"),
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin"),
  tripTime: z.string().optional().default(""),
  direction: z.enum(["ONE_WAY", "ROUND_TRIP"]).default("ONE_WAY"),
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20),
  contactName: z.string().min(2, "Adınız gerekli"),
  contactSurname: z.string().min(2, "Soyadınız gerekli"),
  contactPhone: z.string().min(10, "Telefon gerekli"),
  contactEmail: z.string().email("Geçerli e-posta girin").or(z.literal("")).optional(),
  flightNumber: z.string().optional().default(""),
  specialRequests: z.string().optional().default(""),
});

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
}

export async function submitPublicTransferRequestAction(
  _prev: PublicTransferRequestState,
  formData: FormData
): Promise<PublicTransferRequestState> {
  const ip = await getRequestClientIp();
  const rate = checkRateLimit({
    key: `public-transfer:${ip ?? "unknown"}`,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.ok) {
    return { error: "Çok fazla deneme. Lütfen bir süre sonra tekrar deneyin." };
  }

  const parsed = schema.safeParse({
    routeId: formData.get("routeId"),
    vehicleTypeId: formData.get("vehicleTypeId"),
    startPoint: formData.get("startPoint"),
    endPoint: formData.get("endPoint"),
    tripDate: formData.get("tripDate"),
    tripTime: formData.get("tripTime"),
    direction: formData.get("direction") || "ONE_WAY",
    adults: formData.get("adults") || "1",
    children: formData.get("children") || "0",
    contactName: formData.get("contactName"),
    contactSurname: formData.get("contactSurname"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail") || "",
    flightNumber: formData.get("flightNumber"),
    specialRequests: formData.get("specialRequests"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const data = parsed.data;
  const tripDate = parseDateOnly(data.tripDate);
  if (!tripDate) return { error: "Geçerli bir tarih seçin" };

  const vehicle = await prisma.transferVehicleType.findFirst({
    where: { id: data.vehicleTypeId, isActive: true },
    select: { id: true },
  });
  if (!vehicle) return { error: "Seçilen araç tipi bulunamadı" };

  let routeId: string | null = data.routeId.trim() || null;
  let distanceKm: number | null = null;
  let durationMinutes: number | null = null;
  let totalPrice: number | null = null;

  if (routeId) {
    const route = await prisma.transferRoute.findFirst({
      where: { id: routeId, isActive: true, onList: true },
      include: {
        vehiclePrices: {
          where: { vehicleTypeId: vehicle.id, isActive: true },
          take: 1,
        },
      },
    });
    if (!route) return { error: "Seçilen rota bulunamadı" };
    distanceKm = route.distanceKm;
    durationMinutes = route.durationMinutes;
    totalPrice = route.vehiclePrices[0]?.price ?? null;
  }

  const phoneDigits = normalizeTurkishPhoneDigits(data.contactPhone);
  if (phoneDigits.length < 10) {
    return { error: "Geçerli bir telefon numarası girin" };
  }

  await prisma.transferTrip.create({
    data: {
      routeId,
      vehicleTypeId: vehicle.id,
      startPoint: data.startPoint.trim(),
      endPoint: data.endPoint.trim(),
      distanceKm,
      durationMinutes,
      direction:
        data.direction === "ROUND_TRIP"
          ? TransferTripDirection.ROUND_TRIP
          : TransferTripDirection.ONE_WAY,
      serviceType: "VIP",
      tripDate,
      tripTime: data.tripTime.trim(),
      adults: data.adults,
      children: data.children,
      babies: 0,
      contactName: data.contactName.trim(),
      contactSurname: data.contactSurname.trim(),
      contactPhone: phoneDigits,
      contactEmail: (data.contactEmail ?? "").trim(),
      flightNumber: data.flightNumber.trim(),
      specialRequests: data.specialRequests.trim(),
      totalPrice,
      currency: VillaPeriodCurrency.EUR,
      note: "Public VIP Transfer talebi",
    },
  });

  revalidatePath("/admin/transfer/seferler");

  return {
    success: true,
    message:
      "Transfer talebiniz alındı. Ekibimiz en kısa sürede sizinle iletişime geçecek.",
  };
}
