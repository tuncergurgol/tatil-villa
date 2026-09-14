import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const URL =
  process.argv[2] ||
  "https://rezervasyonyap.tr/tatil-evi/mamon-luxury-life-villa";

async function main() {
  const res = await fetch(URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
  });
  const html = await res.text();
  const out = join(process.cwd(), "scripts", "rezervasyonyap-sample.html");
  writeFileSync(out, html, "utf8");
  console.log("status", res.status, "len", html.length, "->", out);

  const checks = [
    "__NEXT_DATA__",
    "self.__next_f",
    "prices_data",
    "availability",
    "calendar",
    "period",
    "nightly",
    "weekly",
    "fiyat",
    "booked",
    "api/",
    "flight",
    "pricing",
    "pricePeriods",
    "PriceList",
    "Availability",
    "dolu",
    "sezon",
  ];
  for (const c of checks) {
    console.log(c, html.toLowerCase().includes(c.toLowerCase()));
  }

  const apiUrls = [
    ...html.matchAll(/https?:\/\/[^"'\\\s]+(?:api|calendar|price|avail)[^"'\\\s]*/gi),
  ].map((m) => m[0]);
  console.log("api-ish urls", [...new Set(apiUrls)].slice(0, 40));

  const relativeApis = [
    ...html.matchAll(/["'](\/[^"'\\\s]*(?:api|calendar|price|avail|period)[^"'\\\s]*)["']/gi),
  ].map((m) => m[1]);
  console.log("relative apis", [...new Set(relativeApis)].slice(0, 40));

  const nextData = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextData) {
    const parsed = JSON.parse(nextData[1]);
    writeFileSync(
      join(process.cwd(), "scripts", "rezervasyonyap-next-data.json"),
      JSON.stringify(parsed, null, 2).slice(0, 500_000),
      "utf8"
    );
    console.log("NEXT_DATA keys", Object.keys(parsed));
    console.log("page props keys", Object.keys(parsed.props?.pageProps ?? {}));
  }

  // Extract interesting RSC / JSON blobs mentioning price or date
  const datePrice = [
    ...html.matchAll(
      /\{[^{}]{0,200}(?:startDate|endDate|checkIn|checkOut|nightly|price|period)[^{}]{0,200}\}/gi
    ),
  ]
    .map((m) => m[0])
    .slice(0, 30);
  console.log("object snippets", datePrice.length);
  for (const s of datePrice.slice(0, 10)) console.log(" -", s.slice(0, 180));

  // Look for encoded flight data
  const pushes = [...html.matchAll(/self\.__next_f\.push\(\[.*?\]\)/g)];
  console.log("flight pushes", pushes.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
