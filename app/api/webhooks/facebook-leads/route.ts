import { NextResponse } from "next/server";
import { verifyFacebookWebhookSignature } from "@/lib/facebook-lead-graph";
import { processFacebookLeadWebhookPayload } from "@/lib/facebook-lead-webhook";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const settings = await getCompanySettings();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = settings.facebookLeadVerifyToken?.trim();
  if (
    mode === "subscribe" &&
    challenge &&
    expected &&
    token === expected
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Facebook Lead webhook aktif",
    enabled: settings.facebookLeadEnabled,
  });
}

export async function POST(request: Request) {
  const settings = await getCompanySettings();
  if (!settings.facebookLeadEnabled) {
    return NextResponse.json(
      { ok: false, message: "Facebook Lead kapalı" },
      { status: 403 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = settings.facebookLeadAppSecret?.trim();

  if (
    appSecret &&
    !verifyFacebookWebhookSignature(rawBody, signature, appSecret)
  ) {
    return NextResponse.json({ ok: false, message: "İmza geçersiz" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Geçersiz JSON" },
      { status: 400 }
    );
  }

  try {
    const result = await processFacebookLeadWebhookPayload(payload);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    console.error("[facebook-leads-webhook]", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Webhook işlenemedi",
      },
      { status: 500 }
    );
  }
}
