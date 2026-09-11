import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  buildIyzicoPaymentExportFilename,
  getIyzicoPaymentReportRows,
  toIyzicoPaymentExcelRow,
  IYZICO_PAYMENT_EXCEL_HEADERS,
} from "@/lib/queries/iyzico-payment-report";

const postSchema = z.object({
  sessionIds: z.array(z.string().min(1)).min(1),
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

  const idSet = new Set(parsed.data.sessionIds);
  const rows = (await getIyzicoPaymentReportRows()).filter((row) =>
    idSet.has(row.id)
  );

  return NextResponse.json({
    success: true,
    rows: [[...IYZICO_PAYMENT_EXCEL_HEADERS], ...rows.map(toIyzicoPaymentExcelRow)],
    filename: buildIyzicoPaymentExportFilename(),
    count: rows.length,
  });
}
