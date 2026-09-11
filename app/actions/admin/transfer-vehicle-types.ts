"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { toSurroundingSlug } from "@/lib/surrounding-utils";
import { VillaPeriodCurrency } from "@prisma/client";

export type TransferActionState = {
  success?: boolean;
  error?: string;
};

const currencies = ["TL", "EUR", "USD", "GBP"] as const;

const vehicleTypeSchema = z.object({
  code: z.string().min(1, "Kod gerekli"),
  name: z.string().min(1, "Ad gerekli"),
  nameEn: z.string().optional().default(""),
  description: z.string().optional().default(""),
  passengerCapacity: z.coerce.number().int().min(1).max(100),
  luggageCapacity: z.coerce.number().int().min(0).max(100),
  basePricePerKm: z.coerce.number().min(0),
  priceMultiplier: z.coerce.number().min(0),
  minimumFare: z.coerce.number().min(0),
  includedKm: z.coerce.number().min(0),
  currency: z.enum(currencies),
  image: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

function revalidateTransferPaths() {
  revalidatePath("/admin/transfer");
  revalidatePath("/admin/transfer/arac-tipleri");
  revalidatePath("/admin/transfer/rotalar");
  revalidatePath("/admin/transfer/seferler");
}

async function uniqueVehicleCode(code: string, excludeId?: string) {
  const base = toSurroundingSlug(code) || "arac";
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await prisma.transferVehicleType.findUnique({
      where: { code: slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

function parseVehicleForm(formData: FormData) {
  return vehicleTypeSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    nameEn: formData.get("nameEn") ?? "",
    description: formData.get("description") ?? "",
    passengerCapacity: formData.get("passengerCapacity") ?? 4,
    luggageCapacity: formData.get("luggageCapacity") ?? 2,
    basePricePerKm: formData.get("basePricePerKm") ?? 1.5,
    priceMultiplier: formData.get("priceMultiplier") ?? 1,
    minimumFare: formData.get("minimumFare") ?? 15,
    includedKm: formData.get("includedKm") ?? 10,
    currency: formData.get("currency") ?? "EUR",
    image: formData.get("image") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") ?? "true",
  });
}

export async function createTransferVehicleType(
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  await requireAdmin();
  const parsed = parseVehicleForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.transferVehicleType.create({
      data: {
        ...parsed.data,
        code: await uniqueVehicleCode(parsed.data.code),
        currency: parsed.data.currency as VillaPeriodCurrency,
      },
    });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Araç tipi oluşturulamadı" };
  }
}

export async function updateTransferVehicleType(
  _prev: TransferActionState,
  formData: FormData
): Promise<TransferActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = parseVehicleForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.transferVehicleType.update({
      where: { id },
      data: {
        ...parsed.data,
        code: await uniqueVehicleCode(parsed.data.code, id),
        currency: parsed.data.currency as VillaPeriodCurrency,
      },
    });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Araç tipi güncellenemedi" };
  }
}

export async function deleteTransferVehicleType(
  id: string
): Promise<TransferActionState> {
  await requireAdmin();

  const item = await prisma.transferVehicleType.findUnique({
    where: { id },
    include: { _count: { select: { trips: true } } },
  });
  if (!item) return { error: "Kayıt bulunamadı" };
  if (item._count.trips > 0) {
    return {
      error:
        "Bu araç tipine bağlı seferler var. Önce seferleri silin veya tipi pasifleştirin.",
    };
  }

  try {
    await prisma.transferVehicleType.delete({ where: { id } });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Araç tipi silinemedi" };
  }
}

export async function toggleTransferVehicleTypeActive(
  id: string
): Promise<TransferActionState> {
  await requireAdmin();
  const item = await prisma.transferVehicleType.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!item) return { error: "Kayıt bulunamadı" };

  try {
    await prisma.transferVehicleType.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Durum güncellenemedi" };
  }
}
