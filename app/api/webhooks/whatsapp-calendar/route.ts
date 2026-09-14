import { NextResponse } from "next/server";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  processWhatsappCalendarWebhook,
  verifyWhatsappCalendarWebhookSecret,
} from "@/lib/whatsapp-calendar-webhook";

export const dynamic = "force-dynamic";

function readSecret(request: Request) {
  return (
    request.headers.get("x-whatsapp-calendar-secret") ||
    request.headers.get("x-webhook-secret") ||
    new URL(request.url).searchParams.get("secret")
  );
}

export async function POST(request: Request) {
  const settings = await getCompanySettings();
  const secret = readSecret(request);

  if (
    !verifyWhatsappCalendarWebhookSecret(
      secret,
      settings.whatsappCalendarWebhookSecret
    )
  ) {
    return NextResponse.json({ ok: false, message: "Yetkisiz" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Geçersiz JSON" },
      { status: 400 }
    );
  }

  const result = await processWhatsappCalendarWebhook(payload);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "WhatsApp takvim webhook aktif",
  });
}
