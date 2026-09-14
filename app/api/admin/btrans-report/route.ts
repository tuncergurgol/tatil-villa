import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { generateBtransReport } from "@/lib/queries/btrans-report";

const postSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  dateBasis: z.enum(["approvedAt", "createdAt", "checkIn"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const result = await generateBtransReport(parsed.data);
  return NextResponse.json({ success: true, ...result });
}
