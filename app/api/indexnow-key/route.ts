import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { normalizeRequestHostname } from "@/lib/public-site-profile";
import { indexNowKeyForHostname } from "@/lib/search-discovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestHeaders = await headers();
  const hostname = normalizeRequestHostname(
    requestHeaders.get("host") ?? requestHeaders.get("x-forwarded-host")
  );
  const expected = indexNowKeyForHostname(hostname);
  const provided =
    new URL(request.url).searchParams.get("key")?.trim().toLowerCase() ?? "";

  if (!provided || provided !== expected) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(expected, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
