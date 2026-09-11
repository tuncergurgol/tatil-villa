"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  TransferTripDirection,
  TransferTripStatus,
  VillaPeriodCurrency,
} from "@prisma/client";

export type TransferTripActionState = {
  success?: boolean;
  error?: string;
};

const currencies = ["TL", "EUR", "USD", "GBP"] as const;
const directions = ["ONE_WAY", "ROUND_TRIP"] as const;
const statuses = ["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

const tripSchema = z.object({
  routeId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  vehicleTypeId: z.string().min(1, "Araç tipi seçin"),
  startPoint: z.string().min(1, "Başlangıç noktası gerekli"),
  endPoint: z.string().min(1, "Bitiş noktası gerekli"),
  distanceKm: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable()
  ),
  durationMinutes: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int().min(0).nullable()
  ),
  direction: z.enum(directions),
  serviceType: z.string().optional().default(""),
  tripDate: z.string().min(1, "Transfer tarihi gerekli"),
  tripTime: z.string().optional().default(""),
  returnDate: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  returnTime: z.string().optional().default(""),
  adults: z.coerce.number().int().min(1).max(100),
  children: z.coerce.number().int().min(0).max(100),
  babies: z.coerce.number().int().min(0).max(100),
  contactName: z.string().optional().default(""),
  contactSurname: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
  contactEmail: z.string().optional().default(""),
  contactIdNumber: z.string().optional().default(""),
  flightNumber: z.string().optional().default(""),
  driverSign: z.string().optional().default(""),
  totalPrice: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable()
  ),
  currency: z.enum(currencies),
  status: z.enum(statuses),
  note: z.string().optional().default(""),
  adminNote: z.string().optional().default(""),
  specialRequests: z.string().optional().default(""),
});

function revalidateTransferPaths() {
  revalidatePath("/admin/transfer");
  revalidatePath("/admin/transfer/arac-tipleri");
  revalidatePath("/admin/transfer/rotalar");
  revalidatePath("/admin/transfer/seferler");
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTripForm(formData: FormData) {
  return tripSchema.safeParse({
    routeId: formData.get("routeId"),
    vehicleTypeId: formData.get("vehicleTypeId"),
    startPoint: formData.get("startPoint"),
    endPoint: formData.get("endPoint"),
    distanceKm: formData.get("distanceKm"),
    durationMinutes: formData.get("durationMinutes"),
    direction: formData.get("direction") ?? "ONE_WAY",
    serviceType: formData.get("serviceType") ?? "",
    tripDate: formData.get("tripDate"),
    tripTime: formData.get("tripTime") ?? "",
    returnDate: formData.get("returnDate") ?? "",
    returnTime: formData.get("returnTime") ?? "",
    adults: formData.get("adults") ?? 1,
    children: formData.get("children") ?? 0,
    babies: formData.get("babies") ?? 0,
    contactName: formData.get("contactName") ?? "",
    contactSurname: formData.get("contactSurname") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    contactIdNumber: formData.get("contactIdNumber") ?? "",
    flightNumber: formData.get("flightNumber") ?? "",
    driverSign: formData.get("driverSign") ?? "",
    totalPrice: formData.get("totalPrice"),
    currency: formData.get("currency") ?? "EUR",
    status: formData.get("status") ?? "NEW",
    note: formData.get("note") ?? "",
    adminNote: formData.get("adminNote") ?? "",
    specialRequests: formData.get("specialRequests") ?? "",
  });
}

async function toTripData(formData: FormData) {
  const parsed = parseTripForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    } as const;
  }

  const tripDate = parseDateOnly(parsed.data.tripDate);
  if (!tripDate) return { error: "Geçersiz transfer tarihi" } as const;

  const returnDate = parsed.data.returnDate
    ? parseDateOnly(parsed.data.returnDate)
    : null;
  if (parsed.data.returnDate && !returnDate) {
    return { error: "Geçersiz dönüş tarihi" } as const;
  }

  if (parsed.data.routeId) {
    const route = await prisma.transferRoute.findUnique({
      where: { id: parsed.data.routeId },
      select: { id: true },
    });
    if (!route) return { error: "Rota bulunamadı" } as const;
  }

  const vehicleType = await prisma.transferVehicleType.findUnique({
    where: { id: parsed.data.vehicleTypeId },
    select: { id: true },
  });
  if (!vehicleType) return { error: "Araç tipi bulunamadı" } as const;

  return {
    data: {
      routeId: parsed.data.routeId,
      vehicleTypeId: parsed.data.vehicleTypeId,
      startPoint: parsed.data.startPoint.trim(),
      endPoint: parsed.data.endPoint.trim(),
      distanceKm: parsed.data.distanceKm,
      durationMinutes: parsed.data.durationMinutes,
      direction: parsed.data.direction as TransferTripDirection,
      serviceType: parsed.data.serviceType.trim(),
      tripDate,
      tripTime: parsed.data.tripTime.trim(),
      returnDate,
      returnTime: parsed.data.returnTime.trim(),
      adults: parsed.data.adults,
      children: parsed.data.children,
      babies: parsed.data.babies,
      contactName: parsed.data.contactName.trim(),
      contactSurname: parsed.data.contactSurname.trim(),
      contactPhone: parsed.data.contactPhone.trim(),
      contactEmail: parsed.data.contactEmail.trim(),
      contactIdNumber: parsed.data.contactIdNumber.trim(),
      flightNumber: parsed.data.flightNumber.trim(),
      driverSign: parsed.data.driverSign.trim(),
      totalPrice: parsed.data.totalPrice,
      currency: parsed.data.currency as VillaPeriodCurrency,
      status: parsed.data.status as TransferTripStatus,
      note: parsed.data.note.trim(),
      adminNote: parsed.data.adminNote.trim(),
      specialRequests: parsed.data.specialRequests.trim(),
    },
  } as const;
}

export async function createTransferTrip(
  _prev: TransferTripActionState,
  formData: FormData
): Promise<TransferTripActionState> {
  await requireAdmin();
  const prepared = await toTripData(formData);
  if ("error" in prepared) return { error: prepared.error };

  try {
    await prisma.transferTrip.create({ data: prepared.data });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Sefer oluşturulamadı" };
  }
}

export async function updateTransferTrip(
  _prev: TransferTripActionState,
  formData: FormData
): Promise<TransferTripActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Kayıt bulunamadı" };

  const prepared = await toTripData(formData);
  if ("error" in prepared) return { error: prepared.error };

  try {
    await prisma.transferTrip.update({
      where: { id },
      data: prepared.data,
    });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Sefer güncellenemedi" };
  }
}

export async function deleteTransferTrip(
  id: string
): Promise<TransferTripActionState> {
  await requireAdmin();

  try {
    await prisma.transferTrip.delete({ where: { id } });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Sefer silinemedi" };
  }
}
