import { NextResponse } from "next/server";
import { PUBLIC_SITE_KEYS, PUBLIC_SITE_META } from "@/lib/public-site-keys";
import { getPublicIndexablePages } from "@/lib/public-sitemap";
import {
  canonicalOriginFromDomain,
  createIndexNowKey,
  indexNowKeyLocation,
  pingYandexSitemap,
  submitIndexNowUrls,
} from "@/lib/search-discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

function readCronSecret(request: Request) {
  return (
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("secret")
  );
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET tanımlı değil" },
      { status: 503 }
    );
  }

  const provided = readCronSecret(request);
  if (provided !== expected) {
    return NextResponse.json({ ok: false, message: "Yetkisiz" }, { status: 401 });
  }

  const results = [];
  for (const siteKey of PUBLIC_SITE_KEYS) {
    const domain = PUBLIC_SITE_META[siteKey].domain;
    const origin = canonicalOriginFromDomain(domain);
    const host = domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const key = createIndexNowKey(domain);
    const pages = await getPublicIndexablePages(siteKey, origin);
    const submitted = await submitIndexNowUrls({
      host,
      key,
      keyLocation: indexNowKeyLocation(origin),
      urls: pages.map((page) => page.url),
    });
    const yandex = await pingYandexSitemap(`${origin}/sitemap.xml`);
    results.push({ siteKey, host, ...submitted, yandexPing: yandex.status });
  }

  return NextResponse.json({
    ok: results.every((item) => item.ok),
    results,
  });
}
