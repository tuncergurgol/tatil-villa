/**
 * Cloudflare / bot engeli (403) için Playwright yedek yolu.
 * Sayfayı gerçek Chromium ile açar; aynı oturum cookie'leriyle API JSON çeker.
 *
 * Datacenter IP hard-block ("Attention Required!") tek başına aşılmaz;
 * o durumda residential proxy gerekir:
 *   EXTERNAL_SCRAPE_PROXY=http://user:pass@host:port
 */

import { chromium, type Browser, type BrowserContext } from "playwright";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function looksLikeCloudflareChallenge(html: string): boolean {
  if (!html || html.length < 40) return false;
  // "cloudflare" kelimesi tek başına challenge değildir (neredeyse her CF sayfasında geçer).
  return /just a moment|cf-browser-verification|challenge-platform|cdn-cgi\/challenge|attention required!|sorry, you have been blocked|enable javascript and cookies to continue/i.test(
    html
  );
}

export function isBlockedHttpError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /\b(403|429|503)\b/.test(message) || /cloudflare|blocked/i.test(message);
}

function proxyFromEnv(): { server: string } | undefined {
  const raw = process.env.EXTERNAL_SCRAPE_PROXY?.trim();
  if (!raw) return undefined;
  return { server: raw };
}

async function launchContext(): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
    proxy: proxyFromEnv(),
  });
  const context = await browser.newContext({
    userAgent: BROWSER_UA,
    locale: "tr-TR",
    viewport: { width: 1365, height: 900 },
    extraHTTPHeaders: {
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });
  return { browser, context };
}

export type VillaBrowserSession = {
  html: string;
  fetchJson: <T>(url: string, referer?: string) => Promise<T>;
};

/**
 * Sayfayı açıp HTML + cookie’li JSON fetch yardımcısı verir.
 * Bitince tarayıcı kapanır.
 */
export async function withVillaBrowserSession<T>(
  pageUrl: string,
  fn: (session: VillaBrowserSession) => Promise<T>
): Promise<T> {
  const { browser, context } = await launchContext();
  try {
    const page = await context.newPage();
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    // Challenge veya __NEXT_DATA__ / routingData bekle
    await page
      .waitForFunction(
        () => {
          const hasNext = Boolean(document.getElementById("__NEXT_DATA__"));
          const body = document.body?.innerText ?? "";
          const html = document.documentElement?.innerHTML ?? "";
          const challenged =
            /just a moment|cf-browser-verification|challenge-platform/i.test(
              html
            ) || /just a moment/i.test(body);
          if (challenged) return false;
          if (hasNext) return true;
          if (/routingData|\"entityId\"|PriceList/i.test(html)) return true;
          return body.length > 400;
        },
        { timeout: 55_000 }
      )
      .catch(() => {
        /* timeout: yine de content al */
      });

    await page.waitForTimeout(1200);
    const html = await page.content();

    const fetchJson = async <T>(url: string, referer?: string): Promise<T> => {
      const response = await context.request.get(url, {
        headers: {
          Accept: "application/json, text/plain, */*",
          Origin: new URL(pageUrl).origin,
          Referer: referer || pageUrl,
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
        timeout: 45_000,
      });
      if (!response.ok()) {
        throw new Error(`Villa API ${response.status()}: ${url}`);
      }
      return (await response.json()) as T;
    };

    return await fn({ html, fetchJson });
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Sadece HTML (genel yedek). */
export async function fetchHtmlViaPlaywright(pageUrl: string): Promise<string> {
  return withVillaBrowserSession(pageUrl, async ({ html }) => html);
}
