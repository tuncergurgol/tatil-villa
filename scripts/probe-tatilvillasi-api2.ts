import { readFileSync } from "node:fs";

const html = readFileSync("scripts/tatilvillasi-sample.html", "utf8");
const apis = [...html.matchAll(/\/api\/[a-zA-Z0-9_\-/?=&.%]+/g)].map((m) => m[0]);
console.log("api paths", [...new Set(apis)].slice(0, 50));
console.log("graphql", html.includes("graphql"));

const allPushes = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
for (let i = 0; i < allPushes.length; i++) {
  const decoded = allPushes[i]![1]!
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\u0026/g, "&");
  if (
    /seasonPrices|pricePeriods|price_periods|calendarData|availabilityData|blockedDates|bookedDates|dailyPrices|priceTable|prices":\[/.test(
      decoded
    )
  ) {
    console.log("\nPUSH", i, decoded.slice(0, 3000));
  }
}

async function probeMore() {
  const urls = [
    "https://www.tatilvillasi.com.tr/api/villas/mulberry-collection-violet/prices",
    "https://www.tatilvillasi.com.tr/api/villas/mulberry-collection-violet/calendar",
    "https://www.tatilvillasi.com.tr/api/villas/mulberry-collection-violet/availability",
    "https://www.tatilvillasi.com.tr/api/villas/57/prices",
    "https://www.tatilvillasi.com.tr/api/villas/57/calendar",
    "https://www.tatilvillasi.com.tr/api/villas/57/availability",
    "https://www.tatilvillasi.com.tr/api/villa-prices/57",
    "https://www.tatilvillasi.com.tr/api/villa-calendar/57",
    "https://panel.tatilvillasi.com.tr/frontapi/periyotlar/57",
    "https://api.villareyonu.com/villa/57/prices",
    "https://api.villareyonu.com/villas/57/prices",
    "https://www.tatilvillasi.com.tr/api/graphql",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
          Referer:
            "https://www.tatilvillasi.com.tr/villalar/mulberry-collection-violet",
        },
      });
      const text = await res.text();
      console.log("\n", url, res.status, text.slice(0, 400).replace(/\s+/g, " "));
    } catch (e) {
      console.log("ERR", url);
    }
  }
}

probeMore();
