"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { toSurroundingSlug } from "@/lib/surrounding-utils";

export type TransferRouteActionState = {
  success?: boolean;
  error?: string;
};

const routeSchema = z.object({
  title: z.string().min(1, "Başlık gerekli"),
  startPoint: z.string().min(1, "Başlangıç noktası gerekli"),
  endPoint: z.string().min(1, "Bitiş noktası gerekli"),
  slug: z.string().optional().default(""),
  distanceKm: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().min(0).nullable()
  ),
  durationMinutes: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int().min(0).nullable()
  ),
  priority: z.coerce.number().int().min(0).default(0),
  tag: z.string().optional().default(""),
  sefUrl: z.string().optional().default(""),
  seoTitle: z.string().optional().default(""),
  seoDesc: z.string().optional().default(""),
  seoKeywords: z.string().optional().default(""),
  creditCardPaymentEnabled: z
    .enum(["true", "false"])
    .transform((v) => v === "true"),
  bankTransferDiscountRate: z.coerce.number().min(0).max(100).default(0),
  creditCardDiscountRate: z.coerce.number().min(0).max(100).default(0),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
  onList: z.enum(["true", "false"]).transform((v) => v === "true"),
});

function revalidateTransferPaths() {
  revalidatePath("/admin/transfer");
  revalidatePath("/admin/transfer/arac-tipleri");
  revalidatePath("/admin/transfer/rotalar");
  revalidatePath("/admin/transfer/seferler");
}

async function uniqueRouteSlug(title: string, excludeId?: string) {
  const base = toSurroundingSlug(title) || "rota";
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await prisma.transferRoute.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

function parseRoutePrices(formData: FormData) {
  const vehicleTypeIds = formData.getAll("priceVehicleTypeId").map(String);
  const prices = formData.getAll("priceAmount").map(String);
  const rows: { vehicleTypeId: string; price: number }[] = [];

  for (let i = 0; i < vehicleTypeIds.length; i += 1) {
    const vehicleTypeId = vehicleTypeIds[i]?.trim();
    if (!vehicleTypeId) continue;
    const price = Number(prices[i] ?? NaN);
    if (!Number.isFinite(price) || price < 0) continue;
    rows.push({ vehicleTypeId, price });
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.vehicleTypeId)) return false;
    seen.add(row.vehicleTypeId);
    return true;
  });
}

function parseRouteForm(formData: FormData) {
  return routeSchema.safeParse({
    title: formData.get("title"),
    startPoint: formData.get("startPoint"),
    endPoint: formData.get("endPoint"),
    slug: formData.get("slug") ?? "",
    distanceKm: formData.get("distanceKm"),
    durationMinutes: formData.get("durationMinutes"),
    priority: formData.get("priority") ?? 0,
    tag: formData.get("tag") ?? "",
    sefUrl: formData.get("sefUrl") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDesc: formData.get("seoDesc") ?? "",
    seoKeywords: formData.get("seoKeywords") ?? "",
    creditCardPaymentEnabled:
      formData.get("creditCardPaymentEnabled") ?? "false",
    bankTransferDiscountRate: formData.get("bankTransferDiscountRate") ?? 0,
    creditCardDiscountRate: formData.get("creditCardDiscountRate") ?? 0,
    isActive: formData.get("isActive") ?? "true",
    onList: formData.get("onList") ?? "true",
  });
}

export async function createTransferRoute(
  _prev: TransferRouteActionState,
  formData: FormData
): Promise<TransferRouteActionState> {
  await requireAdmin();
  const parsed = parseRouteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const prices = parseRoutePrices(formData);
  const slugInput = parsed.data.slug.trim();
  const slug = slugInput
    ? await uniqueRouteSlug(slugInput)
    : await uniqueRouteSlug(parsed.data.title);

  try {
    await prisma.transferRoute.create({
      data: {
        title: parsed.data.title.trim(),
        slug,
        startPoint: parsed.data.startPoint.trim(),
        endPoint: parsed.data.endPoint.trim(),
        distanceKm: parsed.data.distanceKm,
        durationMinutes: parsed.data.durationMinutes,
        priority: parsed.data.priority,
        tag: parsed.data.tag.trim(),
        sefUrl: parsed.data.sefUrl.trim() || slug,
        seoTitle: parsed.data.seoTitle.trim(),
        seoDesc: parsed.data.seoDesc.trim(),
        seoKeywords: parsed.data.seoKeywords.trim(),
        creditCardPaymentEnabled: parsed.data.creditCardPaymentEnabled,
        bankTransferDiscountRate: parsed.data.bankTransferDiscountRate,
        creditCardDiscountRate: parsed.data.creditCardDiscountRate,
        isActive: parsed.data.isActive,
        onList: parsed.data.onList,
        vehiclePrices: {
          create: prices.map((p) => ({
            vehicleTypeId: p.vehicleTypeId,
            price: p.price,
          })),
        },
      },
    });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Rota oluşturulamadı" };
  }
}

export async function updateTransferRoute(
  _prev: TransferRouteActionState,
  formData: FormData
): Promise<TransferRouteActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = parseRouteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const prices = parseRoutePrices(formData);
  const slugInput = parsed.data.slug.trim();
  const slug = slugInput
    ? await uniqueRouteSlug(slugInput, id)
    : await uniqueRouteSlug(parsed.data.title, id);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.transferRoute.update({
        where: { id },
        data: {
          title: parsed.data.title.trim(),
          slug,
          startPoint: parsed.data.startPoint.trim(),
          endPoint: parsed.data.endPoint.trim(),
          distanceKm: parsed.data.distanceKm,
          durationMinutes: parsed.data.durationMinutes,
          priority: parsed.data.priority,
          tag: parsed.data.tag.trim(),
          sefUrl: parsed.data.sefUrl.trim() || slug,
          seoTitle: parsed.data.seoTitle.trim(),
          seoDesc: parsed.data.seoDesc.trim(),
          seoKeywords: parsed.data.seoKeywords.trim(),
          creditCardPaymentEnabled: parsed.data.creditCardPaymentEnabled,
          bankTransferDiscountRate: parsed.data.bankTransferDiscountRate,
          creditCardDiscountRate: parsed.data.creditCardDiscountRate,
          isActive: parsed.data.isActive,
          onList: parsed.data.onList,
        },
      });

      await tx.transferRouteVehiclePrice.deleteMany({ where: { routeId: id } });
      if (prices.length > 0) {
        await tx.transferRouteVehiclePrice.createMany({
          data: prices.map((p) => ({
            routeId: id,
            vehicleTypeId: p.vehicleTypeId,
            price: p.price,
          })),
        });
      }
    });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Rota güncellenemedi" };
  }
}

export async function deleteTransferRoute(
  id: string
): Promise<TransferRouteActionState> {
  await requireAdmin();

  const item = await prisma.transferRoute.findUnique({
    where: { id },
    include: { _count: { select: { trips: true } } },
  });
  if (!item) return { error: "Kayıt bulunamadı" };
  if (item._count.trips > 0) {
    return {
      error:
        "Bu rotaya bağlı seferler var. Önce seferleri silin veya rotayı pasifleştirin.",
    };
  }

  try {
    await prisma.transferRoute.delete({ where: { id } });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Rota silinemedi" };
  }
}

export async function toggleTransferRouteActive(
  id: string
): Promise<TransferRouteActionState> {
  await requireAdmin();
  const item = await prisma.transferRoute.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!item) return { error: "Kayıt bulunamadı" };

  try {
    await prisma.transferRoute.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
    revalidateTransferPaths();
    return { success: true };
  } catch {
    return { error: "Durum güncellenemedi" };
  }
}
