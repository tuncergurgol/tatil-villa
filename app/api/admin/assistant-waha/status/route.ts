import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getAssistantWahaConfig } from "@/lib/queries/tatil-assistant";
import {
  ensureWahaSession,
  forceRestartWahaSession,
  getWahaConnectionState,
  getWahaQrDataUrl,
  logoutWahaSession,
  normalizePhoneNumberForWaha,
  requestWahaPairingCode,
  sendWahaTextMessageToPhone,
} from "@/lib/waha-client";

export const dynamic = "force-dynamic";

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
  const config = getAssistantWahaConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    return NextResponse.json(toState(false, null, null, null, null, null, null));
  }

  try {
    const connection = await getWahaConnectionState(
      config.baseUrl,
      config.apiKey,
      config.sessionName
    );

    if (!connection) {
      return NextResponse.json(
        toState(true, "STOPPED", null, null, null, null, null)
      );
    }

    let qrDataUrl: string | null = null;
    if (includeQr && connection.status === "SCAN_QR_CODE") {
      qrDataUrl = await getWahaQrDataUrl(
        config.baseUrl,
        config.apiKey,
        config.sessionName
      );
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
        error instanceof Error ? error.message : "WAHA API bağlantısı kurulamadı"
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
    text?: string;
  };

  const settings = await getCompanySettings();
  const config = getAssistantWahaConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    return NextResponse.json(
      toState(
        false,
        null,
        null,
        null,
        null,
        null,
        "Önce WAHA API sunucu adresi ve API anahtarını kaydedin"
      )
    );
  }

  const action = body.action ?? "start";
  const webhookUrl =
    body.webhookUrl ?? "http://localhost:3000/api/webhooks/whatsapp-assistant";

  try {
    const current = await getWahaConnectionState(
      config.baseUrl,
      config.apiKey,
      config.sessionName
    );

    if (action === "send-test") {
      if (current?.status !== "WORKING") {
        return NextResponse.json(
          toState(
            true,
            current?.status ?? null,
            current?.pushName ?? null,
            current?.phoneId ?? null,
            null,
            null,
            "Test mesajı için önce WhatsApp bağlantısının WORKING olması gerekir"
          )
        );
      }
      const phoneNumber = normalizePhoneNumberForWaha(body.phoneNumber ?? "");
      const text = (body.text ?? "").trim();
      if (!phoneNumber || phoneNumber.length < 10) {
        return NextResponse.json(
          toState(
            true,
            current.status,
            current.pushName,
            current.phoneId,
            null,
            null,
            "Geçerli bir telefon numarası girin"
          )
        );
      }
      if (!text) {
        return NextResponse.json(
          toState(
            true,
            current.status,
            current.pushName,
            current.phoneId,
            null,
            null,
            "Test mesajı metni gerekli"
          )
        );
      }
      await sendWahaTextMessageToPhone(
        config.baseUrl,
        config.apiKey,
        config.sessionName,
        phoneNumber,
        text
      );
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

    if (action === "request-pairing-code") {
      const phoneNumber = normalizePhoneNumberForWaha(body.phoneNumber ?? "");
      if (!phoneNumber || phoneNumber.length < 10) {
        return NextResponse.json(
          toState(
            true,
            current?.status ?? null,
            null,
            null,
            null,
            null,
            "Geçerli bir telefon numarası girin (örn. 905496180108)"
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

      await ensureWahaSession(
        config.baseUrl,
        config.apiKey,
        config.sessionName,
        webhookUrl,
        config.webhookSecret
      );

      const pairingCode = await requestWahaPairingCode(
        config.baseUrl,
        config.apiKey,
        config.sessionName,
        phoneNumber
      );

      const latest = await getWahaConnectionState(
        config.baseUrl,
        config.apiKey,
        config.sessionName
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
      await forceRestartWahaSession(
        config.baseUrl,
        config.apiKey,
        config.sessionName,
        webhookUrl,
        config.webhookSecret
      );
    } else {
      await ensureWahaSession(
        config.baseUrl,
        config.apiKey,
        config.sessionName,
        webhookUrl,
        config.webhookSecret
      );
    }

    let latest = await getWahaConnectionState(
      config.baseUrl,
      config.apiKey,
      config.sessionName
    );
    for (let i = 0; i < 6 && latest?.status === "STARTING"; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      latest = await getWahaConnectionState(
        config.baseUrl,
        config.apiKey,
        config.sessionName
      );
    }

    const qrDataUrl =
      latest?.status === "SCAN_QR_CODE" || latest?.status === "STARTING"
        ? await getWahaQrDataUrl(
            config.baseUrl,
            config.apiKey,
            config.sessionName
          )
        : null;

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
  const config = getAssistantWahaConfig(settings);

  if (!config.baseUrl || !config.apiKey) {
    return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 400 });
  }

  try {
    await logoutWahaSession(
      config.baseUrl,
      config.apiKey,
      config.sessionName
    );
    const latest = await getWahaConnectionState(
      config.baseUrl,
      config.apiKey,
      config.sessionName
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
