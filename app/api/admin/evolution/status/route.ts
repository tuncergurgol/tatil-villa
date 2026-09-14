import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  connectEvolutionInstance,
  ensureEvolutionInstance,
  extractEvolutionPairingCode,
  extractEvolutionQrDataUrl,
  getEvolutionConnectionState,
  logoutEvolutionInstance,
  normalizePhoneNumberForEvolution,
  restartEvolutionInstance,
} from "@/lib/evolution-client";

export const dynamic = "force-dynamic";

function getConfig(settings: Awaited<ReturnType<typeof getCompanySettings>>) {
  return {
    baseUrl:
      settings.evolutionBaseUrl?.trim() ||
      process.env.EVOLUTION_BASE_URL?.trim() ||
      "http://localhost:8080",
    apiKey:
      settings.evolutionApiKey?.trim() ||
      process.env.EVOLUTION_API_KEY?.trim() ||
      "",
    instanceName:
      settings.evolutionInstanceName?.trim() ||
      process.env.EVOLUTION_INSTANCE_NAME?.trim() ||
      "tatil-villa",
  };
}

function toState(
  configured: boolean,
  status: string | null,
  pushName: string | null,
  phoneId: string | null,
  qrDataUrl: string | null,
  pairingCode: string | null,
  error: string | null
) {
  return { configured, status, pushName, phoneId, qrDataUrl, pairingCode, error };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const includeQr = new URL(request.url).searchParams.get("qr") === "1";
  const settings = await getCompanySettings();
  const config = getConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    return NextResponse.json(toState(false, null, null, null, null, null, null));
  }

  try {
    const connection = await getEvolutionConnectionState(
      config.baseUrl,
      config.apiKey,
      config.instanceName
    );

    if (!connection) {
      return NextResponse.json(
        toState(true, "STOPPED", null, null, null, null, null)
      );
    }

    let qrDataUrl: string | null = null;
    if (includeQr && connection.status === "SCAN_QR_CODE") {
      try {
        const connect = await connectEvolutionInstance(
          config.baseUrl,
          config.apiKey,
          config.instanceName
        );
        qrDataUrl = extractEvolutionQrDataUrl(connect);
      } catch {
        qrDataUrl = null;
      }
    }

    return NextResponse.json(
      toState(
        true,
        connection.status,
        connection.pushName,
        connection.phoneId,
        qrDataUrl,
        null,
        null
      )
    );
  } catch (error) {
    return NextResponse.json(
      toState(
        true,
        null,
        null,
        null,
        null,
        null,
        error instanceof Error ? error.message : "Evolution API bağlantısı kurulamadı"
      )
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    webhookUrl?: string;
    phoneNumber?: string;
  };

  const settings = await getCompanySettings();
  const config = getConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    return NextResponse.json(
      toState(
        false,
        null,
        null,
        null,
        null,
        null,
        "Önce Evolution API sunucu adresi ve API anahtarını kaydedin"
      )
    );
  }

  const action = body.action ?? "start";
  const webhookUrl =
    body.webhookUrl ?? "http://localhost:3000/api/webhooks/whatsapp-calendar";

  try {
    const current = await getEvolutionConnectionState(
      config.baseUrl,
      config.apiKey,
      config.instanceName
    );

    if (action === "request-pairing-code") {
      const phoneNumber = normalizePhoneNumberForEvolution(body.phoneNumber ?? "");
      if (!phoneNumber || phoneNumber.length < 10) {
        return NextResponse.json(
          toState(
            true,
            current?.status ?? null,
            null,
            null,
            null,
            null,
            "Geçerli bir telefon numarası girin (örn. 905551234567)"
          )
        );
      }

      if (current?.status === "WORKING") {
        return NextResponse.json(
          toState(
            true,
            current.status,
            current.pushName,
            current.phoneId,
            null,
            null,
            null
          )
        );
      }

      await ensureEvolutionInstance(
        config.baseUrl,
        config.apiKey,
        config.instanceName,
        webhookUrl,
        settings.whatsappCalendarWebhookSecret
      );

      const connect = await connectEvolutionInstance(
        config.baseUrl,
        config.apiKey,
        config.instanceName,
        phoneNumber
      );

      const pairingCode = extractEvolutionPairingCode(connect);
      const latest = await getEvolutionConnectionState(
        config.baseUrl,
        config.apiKey,
        config.instanceName
      );

      return NextResponse.json(
        toState(
          true,
          latest?.status ?? "SCAN_QR_CODE",
          latest?.pushName ?? null,
          latest?.phoneId ?? null,
          null,
          pairingCode,
          pairingCode ? null : "Eşleştirme kodu alınamadı. QR ile deneyin."
        )
      );
    }

    if (current?.status === "WORKING" && action !== "force-restart") {
      return NextResponse.json(
        toState(
          true,
          current.status,
          current.pushName,
          current.phoneId,
          null,
          null,
          null
        )
      );
    }

    if (action === "force-restart" || action === "retry") {
      await restartEvolutionInstance(
        config.baseUrl,
        config.apiKey,
        config.instanceName,
        webhookUrl,
        settings.whatsappCalendarWebhookSecret
      );
    } else {
      await ensureEvolutionInstance(
        config.baseUrl,
        config.apiKey,
        config.instanceName,
        webhookUrl,
        settings.whatsappCalendarWebhookSecret
      );
    }

    const connect = await connectEvolutionInstance(
      config.baseUrl,
      config.apiKey,
      config.instanceName
    );
    const qrDataUrl = extractEvolutionQrDataUrl(connect);
    const latest = await getEvolutionConnectionState(
      config.baseUrl,
      config.apiKey,
      config.instanceName
    );

    return NextResponse.json(
      toState(
        true,
        latest?.status ?? (qrDataUrl ? "SCAN_QR_CODE" : "STARTING"),
        latest?.pushName ?? null,
        latest?.phoneId ?? null,
        qrDataUrl,
        null,
        null
      )
    );
  } catch (error) {
    return NextResponse.json(
      toState(
        true,
        null,
        null,
        null,
        null,
        null,
        error instanceof Error ? error.message : "Oturum başlatılamadı"
      )
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const settings = await getCompanySettings();
  const config = getConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 400 });
  }

  try {
    await logoutEvolutionInstance(
      config.baseUrl,
      config.apiKey,
      config.instanceName
    );
    const latest = await getEvolutionConnectionState(
      config.baseUrl,
      config.apiKey,
      config.instanceName
    );
    return NextResponse.json(
      toState(true, latest?.status ?? "STOPPED", null, null, null, null, null)
    );
  } catch (error) {
    return NextResponse.json(
      toState(
        true,
        null,
        null,
        null,
        null,
        null,
        error instanceof Error ? error.message : "Bağlantı kesilemedi"
      ),
      { status: 500 }
    );
  }
}
