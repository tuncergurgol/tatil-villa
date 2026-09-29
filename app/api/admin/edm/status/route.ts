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
    const raw =
      error instanceof Error ? error.message : "EDM bağlantı hatası";
    const isUserMissing = /kullan[ıi]c[ıi]\s+bulunamad[ıi]/i.test(raw);
    const message =
      isUserMissing && process.env.EDM_ENV?.trim().toLowerCase() === "production"
        ? `Canlı EDM login reddedildi: ${raw}. Test kullanıcı/şifre canlı SOAP’ta geçersiz; EDM’den canlı entegrasyon (API) kullanıcı ve parolasını alıp EDM_USERNAME / EDM_PASSWORD olarak güncelleyin.`
        : raw;
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        message,
        environment: process.env.EDM_ENV?.trim() || "test",
      },
      { status: 502 }
    );
  }
}
