import { NextResponse } from "next/server";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getAssistantWahaConfig } from "@/lib/queries/tatil-assistant";
import { processAssistantMessage } from "@/lib/tatil-assistant-runner";
import {
  normalizeWahaAssistantPayload,
  sendAssistantWhatsAppMessage,
} from "@/lib/tatil-assistant-whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret")?.trim();
  const settings = await getCompanySettings();
  const config = getAssistantWahaConfig(settings);

  if (!settings.tatilAssistantEnabled) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  if (config.webhookSecret && secret !== config.webhookSecret) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const normalized = normalizeWahaAssistantPayload(payload);
  if (!normalized) {
    return NextResponse.json({ ok: true, skipped: "ignored" });
  }

  try {
    const result = await processAssistantMessage({
      message: normalized.text,
      channel: "whatsapp",
      whatsappChatId: normalized.chatId,
      guestPhone: normalized.phone,
    });

    if (result.whatsappSent) {
      return NextResponse.json({ ok: true, conversationId: result.conversationId });
    }

    await sendAssistantWhatsAppMessage(normalized.phone, result.reply);

    return NextResponse.json({ ok: true, conversationId: result.conversationId });
  } catch (error) {
    console.error("[whatsapp-assistant]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook işlenemedi",
      },
      { status: 500 }
    );
  }
}
