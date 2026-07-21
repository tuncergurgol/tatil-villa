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

export async function createCallbackRequestAdmin(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) throw new Error("Ad ve telefon zorunlu");

  const status = parseStatus(formData.get("status"));
  const item = await prisma.callbackRequest.create({
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

  if (status !== "PENDING") {
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
  id: string,
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) throw new Error("Ad ve telefon zorunlu");

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

  revalidateCallbackPaths(id);
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
