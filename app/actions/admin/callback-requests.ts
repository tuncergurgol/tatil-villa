"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  CallbackPreferredDay,
  CallbackPreferredTime,
  CallbackRequestStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { notifyNewCallbackRequest } from "@/lib/callback-request-notify";
import { syncCustomerFromCallback } from "@/lib/customer-crm";

const DAYS: CallbackPreferredDay[] = [
  "TODAY",
  "TOMORROW",
  "THIS_WEEK",
  "ANY",
];
const TIMES: CallbackPreferredTime[] = [
  "ASAP",
  "MORNING",
  "AFTERNOON",
  "EVENING",
];
const STATUSES: CallbackRequestStatus[] = [
  "PENDING",
  "VERIFIED",
  "NEW",
  "CONTACTED",
  "CLOSED",
  "CANCELLED",
];

function revalidateCallbackPaths(id?: string) {
  revalidatePath("/admin/acente/sizi-arayalim");
  if (id) revalidatePath(`/admin/acente/sizi-arayalim/${id}`);
}

function parseDay(value: FormDataEntryValue | null): CallbackPreferredDay {
  const raw = String(value ?? "ANY");
  return DAYS.includes(raw as CallbackPreferredDay)
    ? (raw as CallbackPreferredDay)
    : "ANY";
}

function parseTime(value: FormDataEntryValue | null): CallbackPreferredTime {
  const raw = String(value ?? "ASAP");
  return TIMES.includes(raw as CallbackPreferredTime)
    ? (raw as CallbackPreferredTime)
    : "ASAP";
}

function parseStatus(value: FormDataEntryValue | null): CallbackRequestStatus {
  const raw = String(value ?? "VERIFIED");
  return STATUSES.includes(raw as CallbackRequestStatus)
    ? (raw as CallbackRequestStatus)
    : "VERIFIED";
}

export type CallbackRequestActionState = {
  success?: boolean;
  error?: string;
};

async function requireAdminOrError(): Promise<CallbackRequestActionState | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return { error: "Oturum geçersiz. Sayfayı yenileyip tekrar deneyin." };
  }
}

export async function createCallbackRequestAdmin(
  _prev: CallbackRequestActionState,
  formData: FormData
): Promise<CallbackRequestActionState> {
  const authError = await requireAdminOrError();
  if (authError) return authError;

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return { error: "Ad ve telefon zorunlu" };

  const status = parseStatus(formData.get("status"));
  let item;
  try {
    item = await prisma.callbackRequest.create({
      data: {
        name,
        phone,
        note: String(formData.get("note") ?? "").trim(),
        preferredDay: parseDay(formData.get("preferredDay")),
        preferredTime: parseTime(formData.get("preferredTime")),
        status,
        adminNote: String(formData.get("adminNote") ?? "").trim(),
        sourceSite: "Manuel Kayıt",
        sourceDomain: "",
        verifiedAt: status === "PENDING" ? null : new Date(),
      },
    });
  } catch {
    return { error: "Kayıt oluşturulamadı" };
  }

  if (status !== "PENDING") {
    await syncCustomerFromCallback({
      name: item.name,
      phone: item.phone,
      firstContactAt: item.verifiedAt ?? item.createdAt,
    });
    await notifyNewCallbackRequest({
      name: item.name,
      phone: item.phone,
      note: item.note,
      preferredDay: item.preferredDay,
      preferredTime: item.preferredTime,
      sourceSite: item.sourceSite,
      sourceDomain: item.sourceDomain,
    });
  }

  revalidateCallbackPaths(item.id);
  redirect(`/admin/acente/sizi-arayalim/${item.id}`);
}

export async function updateCallbackRequest(
  _prev: CallbackRequestActionState,
  formData: FormData
): Promise<CallbackRequestActionState> {
  const authError = await requireAdminOrError();
  if (authError) return authError;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Kayıt bulunamadı" };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return { error: "Ad ve telefon zorunlu" };

  try {
    await prisma.callbackRequest.update({
      where: { id },
      data: {
        name,
        phone,
        note: String(formData.get("note") ?? "").trim(),
        preferredDay: parseDay(formData.get("preferredDay")),
        preferredTime: parseTime(formData.get("preferredTime")),
        status: parseStatus(formData.get("status")),
        adminNote: String(formData.get("adminNote") ?? "").trim(),
      },
    });
  } catch {
    return { error: "Kayıt güncellenemedi" };
  }

  revalidateCallbackPaths(id);
  return { success: true };
}

export async function deleteCallbackRequest(id: string) {
  await requireAdmin();
  await prisma.callbackRequest.delete({ where: { id } });
  revalidateCallbackPaths();
}

export async function deleteCallbackRequestAndReturn(id: string) {
  await deleteCallbackRequest(id);
  redirect("/admin/acente/sizi-arayalim");
}
