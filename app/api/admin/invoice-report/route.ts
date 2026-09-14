import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { generateInvoiceReportExport } from "@/lib/queries/invoice-report";

const postSchema = z.object({
  bookingIds: z.array(z.string().min(1)).min(1),
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

  const result = await generateInvoiceReportExport(parsed.data.bookingIds);
  return NextResponse.json({ success: true, ...result });
}
