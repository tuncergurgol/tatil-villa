import { NextResponse } from "next/server";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { processAssistantMessage } from "@/lib/tatil-assistant-runner";
import {
  classifyWahaWebhook,
  isAssistantDevWhatsAppAllowed,
  resolveAssistantInboundPhone,
  sendAssistantWhatsAppMessage,
} from "@/lib/tatil-assistant-whatsapp";
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

  const inbound = classifyWahaWebhook(payload);
  if (inbound.action === "ignore") {
    return NextResponse.json({ ok: true, skipped: "ignored" });
  }

  if (inbound.action === "customer") {
    try {
      const phone = await resolveAssistantInboundPhone(
        inbound.chatId,
        inbound.phone
      );
      if (!isAssistantDevWhatsAppAllowed(phone)) {
        return NextResponse.json({ ok: true, skipped: "dev-allowlist" });
      }
      const assistant = await processAssistantMessage({
        message: inbound.text,
        channel: "whatsapp",
        whatsappChatId: inbound.chatId,
        guestPhone: phone,
      });
      if (!assistant.whatsappSent && assistant.reply.trim()) {
        await sendAssistantWhatsAppMessage(phone, assistant.reply);
      }
      return NextResponse.json({
        ok: true,
        conversationId: assistant.conversationId,
      });
    } catch (error) {
      console.error("[whatsapp-assistant]", error);
      return NextResponse.json(
        {
          ok: false,
          message:
            error instanceof Error ? error.message : "Asistan yanıtlayamadı",
        },
        { status: 500 }
      );
    }
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
