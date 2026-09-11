import { revalidatePath } from "next/cache";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import { villaPublicPath } from "@/lib/villa-public-path";

export async function revalidateVillaGallery(villaId: string, slug?: string) {
  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(villaId);
  if (slug) {
    revalidatePath(villaPublicPath(slug));
  }
}
