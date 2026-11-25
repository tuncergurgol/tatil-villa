import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { findVillaByRouteParam } from "@/lib/villa-admin-path.server";

function sessionRole(session: { user?: { id?: string } } | null) {
  return (session?.user as { role?: string } | undefined)?.role ?? "";
}

export async function requireVillaOwnerSession() {
  const session = await auth();
  if (!session?.user?.id || sessionRole(session) !== "VILLA_OWNER") {
    redirect("/admin/login");
  }
  return session;
}

export async function getVillaOwnerPanelVillas(userId: string) {
  return prisma.villa.findMany({
    where: {
      owner: {
        userId,
        active: true,
        user: { active: true },
      },
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      location: true,
      documentNo: true,
      documentType: true,
      image: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function requireOwnedVilla(routeId: string) {
  const session = await requireVillaOwnerSession();
  const routeVilla = await findVillaByRouteParam(routeId);
  if (!routeVilla) notFound();

  const owned = await prisma.villa.findFirst({
    where: {
      id: routeVilla.id,
      owner: {
        userId: session.user.id,
        active: true,
        user: { active: true },
      },
    },
    select: { id: true },
  });
  if (!owned) notFound();

  return { session, routeVilla };
}
