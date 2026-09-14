import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { testEdmConnection } from "@/lib/edm/send-commission-invoices";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const result = await testEdmConnection();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        message: error instanceof Error ? error.message : "EDM bağlantı hatası",
      },
      { status: 502 }
    );
  }
}
