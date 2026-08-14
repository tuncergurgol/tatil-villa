"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { linkMemberToCustomer, normalizeMemberEmail } from "@/lib/member-account";
import { getCurrentMember } from "@/lib/member-session.server";
import {
  isValidTurkishMobileE164,
  normalizePhoneToE164,
} from "@/lib/phone";

const profileSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().email(),
  phone: z
    .string()
    .transform((value) => normalizePhoneToE164(value) ?? "")
    .refine((value) => isValidTurkishMobileE164(value), "Geçerli telefon girin"),
  password: z.string().min(6).optional().or(z.literal("")),
});

export async function updateMemberProfileAction(formData: FormData) {
  const member = await getCurrentMember();
  if (!member) return { error: "Oturum bulunamadı" };

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password")?.toString() || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const email = normalizeMemberEmail(parsed.data.email);
  const phone = parsed.data.phone;

  const duplicate = await prisma.memberAccount.findFirst({
    where: {
      id: { not: member.id },
      OR: [{ email }, { phone }],
    },
    select: { id: true },
  });
  if (duplicate) {
    return { error: "Bu e-posta veya telefon başka bir üyede kayıtlı" };
  }

  await prisma.memberAccount.update({
    where: { id: member.id },
    data: {
      fullName: parsed.data.fullName,
      email,
      phone,
      ...(parsed.data.password
        ? { passwordHash: await bcrypt.hash(parsed.data.password, 12) }
        : {}),
    },
  });

  await linkMemberToCustomer(member.id);
  return { success: true, message: "Profil bilgileriniz güncellendi" };
}
