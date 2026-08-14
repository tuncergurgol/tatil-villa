import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";

const URL =
  "https://www.tatilvillasi.com.tr/villalar/mulberry-collection-violet";

async function main() {
  const html = await fetch(URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
  }).then((r) => r.text());

  const patterns = [
    "__NEXT_DATA__",
    "__NUXT__",
    "routingData",
    "priceTable",
    "api.tatilvillasi",
    "panel.",
    "PriceList",
    "availability",
    "periyot",
    "product_detail",
  ];
  for (const p of patterns) {
    if (html.includes(p)) console.log("FOUND:", p);
  }

  const apiMatches = [
    ...html.matchAll(/https?:\/\/[^"'\s]+/g),
  ]
    .map((m) => m[0])
    .filter((u) => /api|price|calendar|villa|period|avail/i.test(u));
  console.log("API-like URLs:", [...new Set(apiMatches)].slice(0, 40));

  const scriptSrc = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
    (m) => m[1]
  );
  console.log("script src sample:", scriptSrc.slice(0, 15));

  const jsonSnippets = [
    "routingData",
    "prices_data",
    "availabilitys_data",
    "price_list",
    "priceList",
    "pricePeriods",
    "villa_id",
    "villaId",
    "\"id\":57",
    "mulberry-collection-violet",
    "self.__next_f",
    "application/ld+json",
  ];
  for (const s of jsonSnippets) {
    const idx = html.indexOf(s);
    if (idx >= 0) console.log(s, "at", idx, html.slice(idx, idx + 200).replace(/\s+/g, " "));
  }

  const fs = await import("node:fs");
  fs.writeFileSync("scripts/tatilvillasi-sample.html", html);

  const nextMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextMatch) {
    const data = JSON.parse(nextMatch[1]!) as {
      props?: { pageProps?: Record<string, unknown> };
    };
    console.log("NEXT pageProps keys:", Object.keys(data.props?.pageProps ?? {}));
  }

  try {
    const scraped = await scrapeExternalVillaPage(URL);
    console.log("SCRAPE OK", {
      strategy: scraped.strategy,
      periods: scraped.periods.length,
      occupancy: scraped.occupancyByDateKey.size,
      warnings: scraped.warnings,
    });
    console.log("sample periods", scraped.periods.slice(0, 3));
  } catch (error) {
    console.error("SCRAPE FAIL", error);
  }
}

main();
