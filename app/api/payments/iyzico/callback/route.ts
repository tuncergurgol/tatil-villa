import { NextResponse } from "next/server";
import {
  buildCallbackRedirectHtml,
  finalizeBookingIyzicoPayment,
} from "@/lib/payments/finalize-booking-iyzico-payment";

export const dynamic = "force-dynamic";

async function readToken(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const json = (await request.json()) as { token?: string };
      return json.token?.trim() || null;
    } catch {
      return null;
    }
  }

  try {
    const form = await request.formData();
    const token = form.get("token");
    if (typeof token === "string" && token.trim()) return token.trim();
  } catch {
    /* ignore */
  }

  return null;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() ?? "";
  const token = await readToken(request);

  if (!code || !token) {
    return new NextResponse("Geçersiz ödeme dönüşü.", { status: 400 });
  }

  const result = await finalizeBookingIyzicoPayment({ token, reservationCode: code });
  const html = buildCallbackRedirectHtml(result.redirectUrl);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  return POST(request);
}
