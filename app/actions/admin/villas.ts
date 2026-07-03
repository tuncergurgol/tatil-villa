"use server";

import { revalidatePath } from "next/cache";
import { VillaCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export async function createVilla(formData: FormData) {
  await requireAdmin();

  const regionId = formData.get("regionId") as string;
  const imagesRaw = (formData.get("images") as string) || "";
  const amenitiesRaw = (formData.get("amenities") as string) || "";

  await prisma.villa.create({
    data: {
      slug: formData.get("slug") as string,
      name: formData.get("name") as string,
      category: (formData.get("category") as VillaCategory) || VillaCategory.villa,
      regionId,
      location: formData.get("location") as string,
      guests: parseInt(formData.get("guests") as string, 10),
      bedrooms: parseInt(formData.get("bedrooms") as string, 10),
      bathrooms: parseInt(formData.get("bathrooms") as string, 10),
      pricePerNight: formData.get("pricePerNight")
        ? parseInt(formData.get("pricePerNight") as string, 10)
        : null,
      image: formData.get("image") as string,
      images: imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean),
      description: formData.get("description") as string,
      amenities: amenitiesRaw.split(",").map((s) => s.trim()).filter(Boolean),
      featured: formData.get("featured") === "on",
      popular: formData.get("popular") === "on",
      deal: formData.get("deal") === "on",
      recommended: formData.get("recommended") === "on",
    },
  });

  revalidatePath("/");
  revalidatePath("/villalar");
  revalidatePath("/admin/villalar");
}

export async function updateVilla(id: string, formData: FormData) {
  await requireAdmin();

  const imagesRaw = (formData.get("images") as string) || "";
  const amenitiesRaw = (formData.get("amenities") as string) || "";

  await prisma.villa.update({
    where: { id },
    data: {
      slug: formData.get("slug") as string,
      name: formData.get("name") as string,
      category: (formData.get("category") as VillaCategory) || VillaCategory.villa,
      regionId: formData.get("regionId") as string,
      location: formData.get("location") as string,
      guests: parseInt(formData.get("guests") as string, 10),
      bedrooms: parseInt(formData.get("bedrooms") as string, 10),
      bathrooms: parseInt(formData.get("bathrooms") as string, 10),
      pricePerNight: formData.get("pricePerNight")
        ? parseInt(formData.get("pricePerNight") as string, 10)
        : null,
      image: formData.get("image") as string,
      images: imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean),
      description: formData.get("description") as string,
      amenities: amenitiesRaw.split(",").map((s) => s.trim()).filter(Boolean),
      featured: formData.get("featured") === "on",
      popular: formData.get("popular") === "on",
      deal: formData.get("deal") === "on",
      recommended: formData.get("recommended") === "on",
    },
  });

  revalidatePath("/");
  revalidatePath("/villalar");
  revalidatePath("/admin/villalar");
}

export async function deleteVilla(id: string) {
  await requireAdmin();
  await prisma.villa.delete({ where: { id } });
  revalidatePath("/admin/villalar");
  revalidatePath("/villalar");
}
