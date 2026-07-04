import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  parseVillaRouteParam,
  villaAdminEditPath,
} from "@/lib/villa-admin-path";

export async function findVillaByRouteParam(routeParam: string) {
  const parsed = parseVillaRouteParam(routeParam);
  if (parsed.kind === "villaId") {
    return prisma.villa.findUnique({
      where: { villaId: parsed.value },
      select: { id: true, villaId: true },
    });
  }
  return prisma.villa.findUnique({
    where: { id: parsed.value },
    select: { id: true, villaId: true },
  });
}

export async function revalidateVillaEditPage(internalId: string) {
  const villa = await prisma.villa.findUnique({
    where: { id: internalId },
    select: { id: true, villaId: true },
  });
  if (!villa) return;

  revalidatePath(villaAdminEditPath(villa));
  if (villa.villaId != null) {
    revalidatePath(`/admin/villalar/${villa.id}/duzenle`);
  }
}
