import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("scripts/tatilvillasi-sample.html", "utf8");

function unescapeFlightString(raw: string) {
  return raw
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\\\/g, "\\");
}

const pushes = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
const push20 = unescapeFlightString(pushes[20]![1]!);
writeFileSync("scripts/tatilvillasi-push20.txt", push20);

const idx = push20.indexOf('"initialVilla"');
console.log("initialVilla at", idx);
console.log(push20.slice(idx, idx + 12000));

// Extract price-related substrings
for (const key of [
  "prices",
  "pricePeriods",
  "price_periods",
  "seasonPrices",
  "calendar",
  "availability",
  "blocked",
  "booked",
  "reservations",
  "periods",
  "minPrice",
  "maxPrice",
  "lowPrice",
  "highPrice",
  "damageDeposit",
  "minStay",
  "minimumStay",
]) {
  const i = push20.indexOf(`"${key}"`);
  if (i >= 0) {
    console.log("\nKEY", key, push20.slice(i, i + 500));
  }
}
