import { chromium, type Browser } from "playwright";
import { getTatildeyizPageUrl } from "./tatildeyiz-next-data";
import { htmlToExcerpt } from "./tatildeyiz-cms-api";

export type ScrapedCorporatePage = {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
};

function cleanHtml(html: string) {
  return html
    .replace(/\sdata-cursor-ref="[^"]*"/g, "")
    .replace(/\sstyle="[^"]*"/g, "")
    .replace(/<br>/g, "<br />")
    .trim();
}

async function scrapeWithBrowser(browser: Browser, slug: string): Promise<ScrapedCorporatePage | null> {
  const page = await browser.newPage();

  try {
    await page.goto(getTatildeyizPageUrl(slug), {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    await page.waitForSelector(".translatable-content, main h1, main h2", {
      timeout: 45_000,
    });

    await page.waitForTimeout(1500);

    const scraped = await page.evaluate(() => {
      const title =
        document.querySelector("main h1")?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.title.split("|")[0]?.trim() ||
        "";

      const contentNode =
        document.querySelector(".translatable-content") ||
        document.querySelector(".aboutContent") ||
        document.querySelector("main article") ||
        document.querySelector("main .container");

      return {
        title,
        html: contentNode?.innerHTML?.trim() || "",
      };
    });

    if (!scraped.html || scraped.html.length < 40) {
      return null;
    }

    const content = cleanHtml(scraped.html);
    return {
      slug,
      title: scraped.title || slug,
      content,
      excerpt: htmlToExcerpt(content, 180),
    };
  } finally {
    await page.close();
  }
}

export async function scrapeTatildeyizCorporatePages(slugs: string[]) {
  const browser = await chromium.launch({ headless: true });
  const results: ScrapedCorporatePage[] = [];
  const errors: Array<{ slug: string; error: string }> = [];

  try {
    for (const slug of slugs) {
      try {
        console.log(`Sayfa çekiliyor: ${slug}`);
        const page = await scrapeWithBrowser(browser, slug);
        if (!page) {
          errors.push({ slug, error: "İçerik bulunamadı" });
          continue;
        }
        results.push(page);
      } catch (error) {
        errors.push({
          slug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await browser.close();
  }

  return { results, errors };
}
