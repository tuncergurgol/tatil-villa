"use server";

import { revalidatePath } from "next/cache";
import { VillaOwnerType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { getMernisIlceByCode } from "@/lib/mernis-ilce";
import {
  buildOwnerDisplayName,
  normalizeOwnerPhone,
  splitOwnerName,
} from "@/lib/villa-owner-utils";

export type VillaOwnerActionState = {
  success?: boolean;
  error?: string;
};

const optionalEmail = z
  .string()
  .refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Geçerli bir e-posta girin"
  );

const commonSchema = z.object({
  type: z.nativeEnum(VillaOwnerType),
  phone: z.string().min(1, "Telefon numarası gerekli"),
  email: optionalEmail,
  bankAccountHolder: z.string().min(1, "Banka hesap sahibi gerekli"),
  bankIban: z.string().min(1, "IBAN gerekli"),
  accountingCode: z.string(),
  country: z.string().min(1, "Ülke gerekli"),
  mernisIlceCode: z.string().optional(),
  address: z.string().min(1, "Adres gerekli"),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

const gercekKisiSchema = commonSchema.extend({
  type: z.literal(VillaOwnerType.GERCEK_KISI),
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  tcKimlikNo: z
    .string()
    .regex(/^\d{11}$/, "TC Kimlik No 11 haneli olmalıdır"),
});

const tuzelKisiSchema = commonSchema.extend({
  type: z.literal(VillaOwnerType.TUZEL_KISI),
  companyTitle: z.string().min(1, "Ünvan gerekli"),
  authorizedPersonName: z.string().min(1, "Yetkili adı soyadı gerekli"),
  taxOffice: z.string().min(1, "Vergi dairesi gerekli"),
  taxNumber: z.string().min(1, "Vergi no gerekli"),
});

function parseOwnerForm(formData: FormData) {
  const type = formData.get("type") as VillaOwnerType;
  const country = (formData.get("country") as string | null)?.trim() ?? "";
  const mernisIlceCode = (formData.get("mernisIlceCode") as string | null)?.trim();

  const base = {
    type,
    phone: formData.get("phone"),
    email: (formData.get("email") as string | null)?.trim() ?? "",
    bankAccountHolder: formData.get("bankAccountHolder"),
    bankIban: (formData.get("bankIban") as string | null)?.replace(/\s/g, "") ?? "",
    accountingCode: (formData.get("accountingCode") as string | null)?.trim() ?? "",
    country,
    mernisIlceCode:
      country === "Türkiye" && mernisIlceCode ? mernisIlceCode : undefined,
    address: formData.get("address"),
    active: formData.get("active") ?? "true",
  };

  if (type === VillaOwnerType.TUZEL_KISI) {
    return tuzelKisiSchema.safeParse({
      ...base,
      companyTitle: formData.get("companyTitle"),
      authorizedPersonName: formData.get("authorizedPersonName"),
      taxOffice: formData.get("taxOffice"),
      taxNumber: formData.get("taxNumber"),
    });
  }

  return gercekKisiSchema.safeParse({
    ...base,
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    tcKimlikNo: (formData.get("tcKimlikNo") as string | null)?.replace(/\D/g, "") ?? "",
  });
}

function toOwnerData(parsed: z.infer<typeof gercekKisiSchema> | z.infer<typeof tuzelKisiSchema>) {
  const phone = normalizeOwnerPhone(parsed.phone);
  const mernisIlceCode =
    parsed.country === "Türkiye" ? parsed.mernisIlceCode ?? null : null;

  if (parsed.type === VillaOwnerType.TUZEL_KISI) {
    return {
      type: parsed.type,
      name: buildOwnerDisplayName({
        type: parsed.type,
        companyTitle: parsed.companyTitle,
      }),
      firstName: "",
      lastName: "",
      companyTitle: parsed.companyTitle,
      authorizedPersonName: parsed.authorizedPersonName,
      phone,
      email: parsed.email,
      tcKimlikNo: "",
      taxOffice: parsed.taxOffice,
      taxNumber: parsed.taxNumber,
      bankAccountHolder: parsed.bankAccountHolder,
      bankIban: parsed.bankIban.toUpperCase(),
      accountingCode: parsed.accountingCode,
      country: parsed.country,
      mernisIlceCode,
      address: parsed.address,
      active: parsed.active,
    };
  }

  return {
    type: parsed.type,
    name: buildOwnerDisplayName({
      type: parsed.type,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
    }),
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    companyTitle: "",
    authorizedPersonName: "",
    phone,
    email: parsed.email,
    tcKimlikNo: parsed.tcKimlikNo,
    taxOffice: "",
    taxNumber: "",
    bankAccountHolder: parsed.bankAccountHolder,
    bankIban: parsed.bankIban.toUpperCase(),
    accountingCode: parsed.accountingCode,
    country: parsed.country,
    mernisIlceCode,
    address: parsed.address,
    active: parsed.active,
  };
}

function validateTurkeyLocation(
  country: string,
  mernisIlceCode?: string
): string | null {
  if (country !== "Türkiye") return null;
  if (!mernisIlceCode) return "İl ve ilçe seçin";
  if (!getMernisIlceByCode(mernisIlceCode)) return "Geçerli bir il ve ilçe seçin";
  return null;
}

function revalidateOwnerPaths() {
  revalidatePath("/admin/tanimlamalar/villa-sahipleri");
}

export async function createVillaOwner(
  _prev: VillaOwnerActionState,
  formData: FormData
): Promise<VillaOwnerActionState> {
  await requireAdmin();

  const parsed = parseOwnerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const locationError = validateTurkeyLocation(
    parsed.data.country,
    parsed.data.mernisIlceCode
  );
  if (locationError) return { error: locationError };

  try {
    await prisma.villaOwner.create({
      data: toOwnerData(parsed.data),
    });
    revalidateOwnerPaths();
    return { success: true };
  } catch {
    return { error: "Villa sahibi kaydedilemedi" };
  }
}

export async function updateVillaOwner(
  _prev: VillaOwnerActionState,
  formData: FormData
): Promise<VillaOwnerActionState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = parseOwnerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const locationError = validateTurkeyLocation(
    parsed.data.country,
    parsed.data.mernisIlceCode
  );
  if (locationError) return { error: locationError };

  try {
    await prisma.villaOwner.update({
      where: { id },
      data: toOwnerData(parsed.data),
    });
    revalidateOwnerPaths();
    return { success: true };
  } catch {
    return { error: "Villa sahibi güncellenemedi" };
  }
}

export async function authorizeUserAsVillaOwner(
  _prev: VillaOwnerActionState,
  formData: FormData
): Promise<VillaOwnerActionState> {
  await requireAdmin();

  const userId = (formData.get("userId") as string | null)?.trim();
  if (!userId) return { error: "Kullanıcı seçin" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { villaOwner: true },
  });

  if (!user) return { error: "Kullanıcı bulunamadı" };
  if (user.villaOwner) {
    return { error: "Bu kullanıcı zaten villa sahibi olarak tanımlı" };
  }

  const { firstName, lastName } = splitOwnerName(user.name);

  try {
    await prisma.villaOwner.create({
      data: {
        type: VillaOwnerType.GERCEK_KISI,
        name: user.name,
        firstName,
        lastName,
        phone: normalizeOwnerPhone(user.phone),
        email: user.email,
        country: "Türkiye",
        userId: user.id,
        active: true,
      },
    });
    revalidateOwnerPaths();
    return { success: true };
  } catch {
    return { error: "Yetki verilemedi" };
  }
}

export async function deleteVillaOwner(id: string): Promise<VillaOwnerActionState> {
  await requireAdmin();

  const owner = await prisma.villaOwner.findUnique({
    where: { id },
    include: { _count: { select: { villas: true } } },
  });

  if (!owner) return { error: "Kayıt bulunamadı" };
  if (owner._count.villas > 0) {
    return {
      error: "Bağlı villası olan villa sahibi silinemez. Önce villaları başka sahibe taşıyın.",
    };
  }

  try {
    await prisma.villaOwner.delete({ where: { id } });
    revalidateOwnerPaths();
    return { success: true };
  } catch {
    return { error: "Villa sahibi silinemedi" };
  }
}
