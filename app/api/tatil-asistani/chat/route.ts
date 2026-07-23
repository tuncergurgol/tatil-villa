import { NextResponse } from "next/server";
import { getTatilAssistantRuntimeContext } from "@/lib/queries/tatil-assistant";
import { processAssistantMessage } from "@/lib/tatil-assistant-runner";

export const dynamic = "force-dynamic";

const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  const context = await getTatilAssistantRuntimeContext();
  if (!context) {
    return NextResponse.json(
      { error: "Tatil Asistanı şu an kullanılamıyor" },
      { status: 503 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz bekleyin." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    conversationId?: string;
    message?: string;
    guestPhone?: string;
  };

  const message = (body.message ?? "").trim();
  if (!message && !body.conversationId) {
    const result = await processAssistantMessage({ message: "" });
    return NextResponse.json(result);
  }

  if (!message) {
    return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
  }

  try {
    const result = await processAssistantMessage({
      conversationId: body.conversationId,
      message,
      channel: "web",
      guestPhone: body.guestPhone,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Asistan yanıt veremedi",
      },
      { status: 500 }
    );
  }
}
