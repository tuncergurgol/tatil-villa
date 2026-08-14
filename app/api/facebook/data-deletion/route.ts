import { NextResponse } from "next/server";
import {
  buildDataDeletionConfirmation,
  parseFacebookSignedRequest,
} from "@/lib/facebook-data-deletion";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getRequestHostname, resolvePublicSiteProfile } from "@/lib/public-site-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Facebook veri silme geri arama uç noktası aktif",
  });
}

export async function POST(request: Request) {
  const settings = await getCompanySettings();
  const appSecret = settings.facebookLeadAppSecret?.trim();

  if (!appSecret) {
    return NextResponse.json(
      { error: "App secret yapılandırılmamış" },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const signedRequest = String(form.get("signed_request") ?? "").trim();

  if (!signedRequest) {
    return NextResponse.json(
      { error: "signed_request gerekli" },
      { status: 400 }
    );
  }

  const payload = parseFacebookSignedRequest(signedRequest, appSecret);
  if (!payload?.user_id) {
    return NextResponse.json(
      { error: "Geçersiz signed_request" },
      { status: 400 }
    );
  }

  const hostname = await getRequestHostname();
  const site = resolvePublicSiteProfile(settings, hostname);
  const confirmationCode = `fb-del-${payload.user_id}-${Date.now().toString(36)}`;

  // Lead Ads verisi Facebook user_id ile doğrudan eşleşmeyebilir;
  // talep kaydı confirmation_code ile izlenebilir.
  return NextResponse.json(
    buildDataDeletionConfirmation(site.domain, confirmationCode)
  );
}
