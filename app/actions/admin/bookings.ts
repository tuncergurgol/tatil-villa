"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { updateBookingStatus } from "@/lib/queries/bookings";
import { requireAdmin } from "@/lib/auth-helpers";

export async function changeBookingStatus(id: string, status: BookingStatus) {
  await requireAdmin();
  await updateBookingStatus(id, status);
  revalidatePath("/admin/rezervasyonlar");
}
