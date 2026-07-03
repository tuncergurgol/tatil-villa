"use server";

import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Yetkisiz erişim");
  }
  return session;
}
