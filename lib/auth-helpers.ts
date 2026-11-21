"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const STAFF_ROLES = new Set(["ADMIN", "SALES_REP"]);

function sessionRole(
  session: { user?: { id?: string } } | null
) {
  return (session?.user as { role?: string } | undefined)?.role ?? "";
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.has(sessionRole(session))) {
    throw new Error("Yetkisiz erişim");
  }
  return session;
}

/** Yönetici, satış veya villa sahibi oturumu. */
export async function requirePanelUser() {
  const session = await auth();
  const role = sessionRole(session);
  if (
    !session?.user ||
    (role !== "ADMIN" && role !== "SALES_REP" && role !== "VILLA_OWNER")
  ) {
    throw new Error("Yetkisiz erişim");
  }
  return session;
}
export async function requireVillaEditor(villaId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Yetkisiz erişim");
  }

  const role = sessionRole(session);
  if (STAFF_ROLES.has(role)) return session;
  if (role !== "VILLA_OWNER") {
    throw new Error("Yetkisiz erişim");
  }

  const id = villaId.trim();
  if (!id) throw new Error("Yetkisiz erişim");

  const villa = await prisma.villa.findFirst({
    where: {
      id,
      owner: {
        userId: session.user.id,
        active: true,
        user: { active: true, role: "VILLA_OWNER" },
      },
    },
    select: { id: true },
  });

  if (!villa) throw new Error("Yetkisiz erişim");
  return session;
}
