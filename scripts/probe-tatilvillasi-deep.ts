import { readFileSync } from "node:fs";

const html = readFileSync("scripts/tatilvillasi-sample.html", "utf8");

const fieldNames = [
  "prices_data",
  "availabilitys_data",
  "price_data",
  "calendar_data",
  "calendarData",
  "pricePeriods",
  "price_periods",
  "seasonPrices",
  "season_prices",
  "blocked_dates",
  "booked_dates",
  "reservations",
  "priceList",
  "price_list",
  "villa_prices",
  "villaPrices",
  "periods",
  "availability",
  "calendar",
  "prices",
  "priceRange",
  "lowPrice",
  "highPrice",
  "check_in",
  "check_out",
  "min_stay",
  "damage_deposit",
  "RoutingId",
  "villa_id",
  "villaId",
];

for (const field of fieldNames) {
  const idx = html.indexOf(field);
  if (idx >= 0) {
    console.log(
      field,
      "->",
      html.slice(idx, idx + 300).replace(/\s+/g, " ").slice(0, 280)
    );
  }
}

// Extract all self.__next_f.push payloads mentioning price/calendar
const pushes = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
console.log("\nRSC pushes total:", pushes.length);
for (const match of pushes) {
  const chunk = match[1]!;
  if (
    /price|calendar|avail|period|season|5570|12250|check_in|check_out/i.test(
      chunk
    )
  ) {
    console.log("\n--- RSC chunk ---");
    console.log(chunk.slice(0, 800));
  }
}

// JSON-LD blocks
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
for (const m of ld) {
  try {
    const data = JSON.parse(m[1]!);
    console.log("\nLD+JSON type:", data["@type"], JSON.stringify(data).slice(0, 500));
  } catch {
    console.log("LD parse fail");
  }
}

async function probeApis() {
  const base = "https://www.tatilvillasi.com.tr";
  const paths = [
    "/api/villa/57",
    "/api/villas/57",
    "/api/villa/57/prices",
    "/api/villa/57/calendar",
    "/api/villa/57/availability",
    "/api/villas/mulberry-collection-violet",
    "/api/villa/mulberry-collection-violet",
    "/api/villa/mulberry-collection-violet/prices",
    "/api/price/57",
    "/api/calendar/57",
    "/api/v1/villa/57",
    "/api/v1/villas/57/prices",
    "/api/v1/villas/57/availability",
    "/api/public/villa/57",
    "/api/public/villas/57/prices",
    "/api/public/villas/57/calendar",
    "/trpc/villa.getPrices",
  ];
  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      });
      const text = await res.text();
      console.log(path, res.status, text.slice(0, 180).replace(/\s+/g, " "));
    } catch (error) {
      console.log(path, "ERR", error);
    }
  }
}

probeApis();
