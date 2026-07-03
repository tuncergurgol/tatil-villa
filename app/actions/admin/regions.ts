"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export async function createRegion(formData: FormData) {
  await requireAdmin();
  await prisma.region.create({
    data: {
      slug: formData.get("slug") as string,
      name: formData.get("name") as string,
      image: formData.get("image") as string,
    },
  });
  revalidatePath("/");
  revalidatePath("/admin/bolgeler");
}

export async function updateRegion(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.region.update({
    where: { id },
    data: {
      slug: formData.get("slug") as string,
      name: formData.get("name") as string,
      image: formData.get("image") as string,
    },
  });
  revalidatePath("/");
  revalidatePath("/admin/bolgeler");
}

export async function deleteRegion(id: string) {
  await requireAdmin();
  await prisma.region.delete({ where: { id } });
  revalidatePath("/admin/bolgeler");
  revalidatePath("/");
}
