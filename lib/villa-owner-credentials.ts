import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,40}$/;

export function normalizeOwnerUsername(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function ownerLoginEmail(username: string) {
  return `sahip.${username}@owners.internal`;
}

export async function syncVillaOwnerLogin(
  ownerId: string,
  formData: FormData
): Promise<{ error: string } | null> {
  if (!formData.has("loginUsername")) return null;

  const username = normalizeOwnerUsername(
    String(formData.get("loginUsername") ?? "")
  );
  const password = String(formData.get("loginPassword") ?? "");

  const owner = await prisma.villaOwner.findUnique({
    where: { id: ownerId },
    include: {
      user: {
        select: { id: true, role: true, email: true },
      },
    },
  });
  if (!owner) return { error: "Villa sahibi bulunamadı" };

  if (owner.user && owner.user.role !== UserRole.VILLA_OWNER) {
    return null;
  }

  if (!username) {
    if (owner.user) {
      await prisma.user.update({
        where: { id: owner.user.id },
        data: { active: false, username: null },
      });
      await prisma.villaOwner.update({
        where: { id: ownerId },
        data: { userId: null },
      });
    }
    return null;
  }

  if (/\s/.test(String(formData.get("loginUsername") ?? ""))) {
    return { error: "Kullanıcı adında boşluk olamaz" };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      error:
        "Kullanıcı adı 3-40 karakter olmalı; küçük harf, rakam, nokta, alt çizgi veya tire kullanılabilir",
    };
  }
  if (!owner.user && password.length < 6) {
    return { error: "Panel şifresi en az 6 karakter olmalı" };
  }
  if (password && password.length < 6) {
    return { error: "Panel şifresi en az 6 karakter olmalı" };
  }

  const email = ownerLoginEmail(username);
  const taken = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
      ...(owner.user ? { NOT: { id: owner.user.id } } : {}),
    },
    select: { id: true },
  });
  if (taken) return { error: "Bu kullanıcı adı kullanılıyor" };

  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  if (!owner.user) {
    const created = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: passwordHash!,
        name: owner.name,
        phone: owner.phone,
        role: UserRole.VILLA_OWNER,
        active: owner.active,
      },
      select: { id: true },
    });
    await prisma.villaOwner.update({
      where: { id: ownerId },
      data: { userId: created.id },
    });
    return null;
  }

  await prisma.user.update({
    where: { id: owner.user.id },
    data: {
      username,
      email: owner.user.email.endsWith("@owners.internal")
        ? email
        : owner.user.email,
      name: owner.name,
      phone: owner.phone,
      active: owner.active,
      role: UserRole.VILLA_OWNER,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });
  return null;
}
