import { createHmac } from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";
import {
  PUBLIC_SITE_KEYS,
  PUBLIC_SITE_META,
  type PublicSiteKey,
} from "@/lib/public-site-keys";

export function canonicalOriginFromDomain(domain: string): string {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return `https://${cleaned || "www.tatildeyiz.com.tr"}`;
}

function indexNowSecret(): string {
  return getAuthSecret() || process.env.CRON_SECRET || "tatildeyiz-indexnow";
}

/** IndexNow anahtarı (8–128 hex). Site başına sabit; public .txt dosyasında yer alır. */
export function createIndexNowKey(siteDomain: string): string {
  return createHmac("sha256", indexNowSecret())
    .update(`indexnow:${siteDomain.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

function siteKeyFromHostname(hostname: string): PublicSiteKey {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  for (const siteKey of PUBLIC_SITE_KEYS) {
    const domain = PUBLIC_SITE_META[siteKey].domain
      .toLowerCase()
      .replace(/^www\./, "");
    if (normalized === domain) return siteKey;
  }
  return "tatildeyiz";
}

export function indexNowKeyForHostname(hostname: string): string {
  const siteKey = siteKeyFromHostname(hostname);
  return createIndexNowKey(PUBLIC_SITE_META[siteKey].domain);
}

export function indexNowKeyLocation(origin: string, key: string): string {
  return `${origin.replace(/\/+$/, "")}/${key}.txt`;
}

export function buildSearchEngineVerification(input: {
  googleSearchConsoleCode?: string | null;
  bingWebmasterCode?: string | null;
  yandexWebmasterCode?: string | null;
}): {
  google?: string;
  yandex?: string;
  other?: Record<string, string>;
} | undefined {
  const google = input.googleSearchConsoleCode?.trim();
  const bing = input.bingWebmasterCode?.trim();
  const yandex = input.yandexWebmasterCode?.trim();
  const other: Record<string, string> = {};
  if (bing) other["msvalidate.01"] = bing;

  if (!google && !yandex && Object.keys(other).length === 0) {
    return undefined;
  }

  return {
    ...(google ? { google } : {}),
    ...(yandex ? { yandex } : {}),
    ...(Object.keys(other).length > 0 ? { other } : {}),
  };
}

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_BATCH = 10000;

export async function submitIndexNowUrls(input: {
  host: string;
  key: string;
  keyLocation: string;
  urls: string[];
}): Promise<{ ok: boolean; submitted: number; status: number; message: string }> {
  const unique = [...new Set(input.urls.filter(Boolean))];
  if (unique.length === 0) {
    return { ok: true, submitted: 0, status: 200, message: "URL yok" };
  }

  let submitted = 0;
  let lastStatus = 0;
  let lastBody = "";

  for (let offset = 0; offset < unique.length; offset += INDEXNOW_BATCH) {
    const urlList = unique.slice(offset, offset + INDEXNOW_BATCH);
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: input.host,
        key: input.key,
        keyLocation: input.keyLocation,
        urlList,
      }),
    });
    lastStatus = response.status;
    lastBody = (await response.text()).slice(0, 300);
    if (!response.ok && response.status !== 202) {
      return {
        ok: false,
        submitted,
        status: lastStatus,
        message: lastBody || `IndexNow HTTP ${lastStatus}`,
      };
    }
    submitted += urlList.length;
  }

  return {
    ok: true,
    submitted,
    status: lastStatus,
    message: lastBody || "IndexNow kabul etti",
  };
}

/** Yandex Webmaster sitemap ping (IndexNow ile birlikte). */
export async function pingYandexSitemap(
  sitemapUrl: string
): Promise<{ ok: boolean; status: number }> {
  const url = `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  try {
    const response = await fetch(url, { method: "GET" });
    return {
      ok: response.ok || response.status === 202,
      status: response.status,
    };
  } catch {
    return { ok: false, status: 0 };
  }
}

export function buildOrganizationJsonLd(input: {
  origin: string;
  brandName: string;
  companyTitle?: string;
  description?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  sameAs?: string[];
}): Record<string, unknown> {
  const logo = input.logoUrl?.trim()
    ? input.logoUrl.startsWith("http")
      ? input.logoUrl
      : `${input.origin}${input.logoUrl.startsWith("/") ? "" : "/"}${input.logoUrl}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "Organization"],
    name: input.brandName,
    legalName: input.companyTitle || undefined,
    url: input.origin,
    description: input.description || undefined,
    logo: logo,
    image: logo,
    email: input.email || undefined,
    telephone: input.phone || undefined,
    address: input.address
      ? {
          "@type": "PostalAddress",
          streetAddress: input.address,
          addressCountry: "TR",
        }
      : undefined,
    sameAs: (input.sameAs ?? []).filter(Boolean),
  };
}

export function buildWebSiteJsonLd(input: {
  origin: string;
  brandName: string;
  description?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.brandName,
    url: input.origin,
    description: input.description || undefined,
    inLanguage: "tr-TR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${input.origin}/villalar?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildLlmsTxt(input: {
  origin: string;
  brandName: string;
  description: string;
  villaCount: number;
}): string {
  const origin = input.origin.replace(/\/+$/, "");
  return `# ${input.brandName}

> ${input.description}

Türkiye'de kiralık villa, bungalov ve tatil evi rezervasyonu. ${input.villaCount} villa ilanı.

## Kaynaklar

- [Ana sayfa](${origin}/)
- [Villalar](${origin}/villalar)
- [Blog](${origin}/blog)
- [Yorumlar](${origin}/yorumlar)
- [SSS](${origin}/sik-sorulan-sorular)
- [Turlar](${origin}/tur)
- [Araç kiralama](${origin}/arac-kiralama)
- [Sitemap](${origin}/sitemap.xml)
- [RSS](${origin}/rss.xml)
- [Tam içerik listesi](${origin}/llms-full.txt)
- [AI keşif (well-known)](${origin}/.well-known/llms.txt)

## Notlar

- Kanonik dil Türkçe'dir. /en /de /fr gibi dil önekleri kopyadır; dizine eklenmez.
- Filtreli /villalar? URL'leri kopya arama sonuçlarıdır.
- Rezervasyon ve fiyat için villa detay sayfalarını kullanın.
`;
}

export function buildLlmsFullTxt(input: {
  origin: string;
  brandName: string;
  description: string;
  pages: Array<{ title: string; url: string }>;
}): string {
  const origin = input.origin.replace(/\/+$/, "");
  const lines = input.pages.map((page) => `- [${page.title}](${page.url})`);
  return `# ${input.brandName} — tam sayfa listesi

> ${input.description}

Kanonik site: ${origin}

${lines.join("\n")}
`;
}