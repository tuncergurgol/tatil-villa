import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { normalizeRequestHostname } from "@/lib/public-site-profile";
import { indexNowKeyForHostname } from "@/lib/search-discovery";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestHeaders = await headers();
  const hostname = normalizeRequestHostname(
    requestHeaders.get("host") ?? requestHeaders.get("x-forwarded-host")
  );
  const key = indexNowKeyForHostname(hostname);

  return new NextResponse(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
