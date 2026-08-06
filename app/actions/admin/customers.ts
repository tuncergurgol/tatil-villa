"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { normalizeStoredTurkishPhone } from "@/lib/phone-utils";

export type CustomerActionState = {
  success?: boolean;
  error?: string;
  id?: string;
};

const optionalEmail = z
  .string()
  .optional()
  .default("")
  .refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Geçerli bir e-posta girin"
  );

const customerSchema = z.object({
  fullName: z.string().trim().min(1, "Ad soyad gerekli"),
  phone: z.string().optional().default(""),
  email: optionalEmail,
  contactChannelId: z.string().optional().default(""),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

function parseCustomerForm(formData: FormData) {
  const contactChannelId =
    (formData.get("contactChannelId") as string | null)?.trim() ?? "";

  return customerSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: (formData.get("email") as string | null)?.trim() ?? "",
    contactChannelId,
    active: formData.get("active") ?? "true",
  });
}

function toCustomerData(parsed: z.infer<typeof customerSchema>) {
  return {
    fullName: parsed.fullName.trim(),
    phone: normalizeStoredTurkishPhone(parsed.phone),
    email: parsed.email.trim(),
    contactChannelId: parsed.contactChannelId || null,
    firstContactAt: new Date(),
    active: parsed.active,
  };
}

function revalidateCustomerPaths() {
  revalidatePath("/admin/musteri-yonetimi");
}

export async function createCustomer(
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  await requireAdmin();

  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    const created = await prisma.customer.create({
      data: toCustomerData(parsed.data),
    });
    revalidateCustomerPaths();
    return { success: true, id: created.id };
  } catch {
    return { error: "Müşteri kaydedilemedi" };
  }
}

export async function updateCustomer(
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.customer.update({
      where: { id },
      data: toCustomerData(parsed.data),
    });
    revalidateCustomerPaths();
    return { success: true };
  } catch {
    return { error: "Müşteri güncellenemedi" };
  }
}

export async function deleteCustomer(id: string): Promise<CustomerActionState> {
  await requireAdmin();

  try {
    await prisma.customer.delete({ where: { id } });
    revalidateCustomerPaths();
    return { success: true };
  } catch {
    return { error: "Müşteri silinemedi" };
  }
}

export async function lookupCustomerByPhoneAction(phone: string) {
  await requireAdmin();

  const { lookupCustomerByPhone } = await import("@/lib/queries/customer-lookup");
  return lookupCustomerByPhone(phone);
}
