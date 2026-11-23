import { NextResponse } from "next/server";
import { processAssistantMessage } from "@/lib/tatil-assistant-runner";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIp } from "@/lib/request-client-ip";
import { normalizeRequestHostHeader } from "@/lib/booking-site-brand";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const settings = await getCompanySettings();
  if (!settings.tatilAssistantEnabled) {
    return NextResponse.json(
      { error: "Tatil Asistanı şu an kullanılamıyor" },
      { status: 503 }
    );
  }

  const clientIp = (await getRequestClientIp()) || "unknown";
  const limit = checkRateLimit({
    key: `yumyum:${clientIp}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Çok fazla mesaj gönderildi. Biraz sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    conversationId?: unknown;
    message?: unknown;
  } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "Mesaj boş veya çok uzun" }, { status: 400 });
  }

  const host = normalizeRequestHostHeader(
    request.headers.get("x-forwarded-host") || request.headers.get("host")
  );

  try {
    const result = await processAssistantMessage({
      conversationId:
        typeof body?.conversationId === "string" ? body.conversationId : undefined,
      message,
      channel: "web",
      publicHost: host,
    });
    return NextResponse.json({
      conversationId: result.conversationId,
      reply: result.reply,
      shareUrl: result.shareUrl,
    });
  } catch (error) {
    console.error("[tatil-asistani]", error);
    return NextResponse.json(
      { error: "Yanıt oluşturulamadı. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
