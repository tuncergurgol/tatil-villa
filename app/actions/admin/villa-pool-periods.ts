"use server";

import { revalidatePath } from "next/cache";
import type { VillaPeriodCurrency } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import {
  dateKeyToDbDate,
  parseDateKey,
} from "@/lib/villa-period-calendar";

export type VillaPoolPeriodActionState = {
  error?: string;
  success?: boolean;
};

const CURRENCIES = new Set(["TL", "EUR", "USD", "GBP"]);

function parseCurrency(value: FormDataEntryValue | null): VillaPeriodCurrency {
  const raw = String(value ?? "TL");
  return (CURRENCIES.has(raw) ? raw : "TL") as VillaPeriodCurrency;
}

function parseOptionalPositiveInt(value: FormDataEntryValue | null) {
  if (value == null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function compareDates(a: Date, b: Date) {
  return a.getTime() - b.getTime();
}

async function revalidateVillaEdit(villaId: string) {
  await revalidateVillaEditPage(villaId);
  revalidatePath("/admin/villalar");
}

async function resolvePoolContext(poolId: string, villaId: string) {
  return prisma.villaPool.findFirst({
    where: { id: poolId, villaId },
    select: { id: true, heated: true, villaId: true },
  });
}

export async function createVillaPoolPeriod(
  formData: FormData
): Promise<VillaPoolPeriodActionState> {
  await requireAdmin();

  const poolId = String(formData.get("poolId") ?? "");
  const villaId = String(formData.get("villaId") ?? "");
  if (!poolId || !villaId) return { error: "Havuz bulunamadı" };

  const pool = await resolvePoolContext(poolId, villaId);
  if (!pool) return { error: "Havuz bulunamadı" };
  if (!pool.heated) {
    return { error: "Havuz periyotları yalnızca ısıtmalı havuzlar için tanımlanabilir" };
  }

  const startRaw = String(formData.get("startDate") ?? "").trim();
  const endRaw = String(formData.get("endDate") ?? "").trim();
  if (!startRaw || !endRaw) return { error: "Başlangıç ve bitiş tarihi gerekli" };

  let startDate: Date;
  let endDate: Date;
  try {
    startDate = dateKeyToDbDate(startRaw);
    endDate = dateKeyToDbDate(endRaw);
  } catch {
    return { error: "Geçersiz tarih formatı" };
  }

  if (compareDates(parseDateKey(startRaw), parseDateKey(endRaw)) > 0) {
    return { error: "Bitiş tarihi başlangıçtan önce olamaz" };
  }

  await prisma.villaPoolPeriod.create({
    data: {
      poolId,
      name: String(formData.get("name") ?? "").trim(),
      startDate,
      endDate,
      heatingFee: parseOptionalPositiveInt(formData.get("heatingFee")),
      heatingFeeCurrency: parseCurrency(formData.get("heatingFeeCurrency")),
      poolOpen: formData.get("poolOpen") === "true",
    },
  });

  await revalidateVillaEdit(villaId);
  return { success: true };
}

export async function updateVillaPoolPeriod(
  formData: FormData
): Promise<VillaPoolPeriodActionState> {
  await requireAdmin();

  const periodId = String(formData.get("periodId") ?? "");
  const poolId = String(formData.get("poolId") ?? "");
  const villaId = String(formData.get("villaId") ?? "");
  if (!periodId || !poolId || !villaId) return { error: "Periyot bulunamadı" };

  const pool = await resolvePoolContext(poolId, villaId);
  if (!pool) return { error: "Havuz bulunamadı" };
  if (!pool.heated) {
    return { error: "Havuz periyotları yalnızca ısıtmalı havuzlar için tanımlanabilir" };
  }

  const existing = await prisma.villaPoolPeriod.findFirst({
    where: { id: periodId, poolId },
    select: { id: true },
  });
  if (!existing) return { error: "Periyot bulunamadı" };

  const startRaw = String(formData.get("startDate") ?? "").trim();
  const endRaw = String(formData.get("endDate") ?? "").trim();
  if (!startRaw || !endRaw) return { error: "Başlangıç ve bitiş tarihi gerekli" };

  let startDate: Date;
  let endDate: Date;
  try {
    startDate = dateKeyToDbDate(startRaw);
    endDate = dateKeyToDbDate(endRaw);
  } catch {
    return { error: "Geçersiz tarih formatı" };
  }

  if (compareDates(parseDateKey(startRaw), parseDateKey(endRaw)) > 0) {
    return { error: "Bitiş tarihi başlangıçtan önce olamaz" };
  }

  await prisma.villaPoolPeriod.update({
    where: { id: periodId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      startDate,
      endDate,
      heatingFee: parseOptionalPositiveInt(formData.get("heatingFee")),
      heatingFeeCurrency: parseCurrency(formData.get("heatingFeeCurrency")),
      poolOpen: formData.get("poolOpen") === "true",
    },
  });

  await revalidateVillaEdit(villaId);
  return { success: true };
}

export async function deleteVillaPoolPeriod(
  periodId: string,
  poolId: string,
  villaId: string
): Promise<VillaPoolPeriodActionState> {
  await requireAdmin();

  const pool = await resolvePoolContext(poolId, villaId);
  if (!pool) return { error: "Havuz bulunamadı" };

  const existing = await prisma.villaPoolPeriod.findFirst({
    where: { id: periodId, poolId },
    select: { id: true },
  });
  if (!existing) return { error: "Periyot bulunamadı" };

  await prisma.villaPoolPeriod.delete({ where: { id: periodId } });
  await revalidateVillaEdit(villaId);
  return { success: true };
}
