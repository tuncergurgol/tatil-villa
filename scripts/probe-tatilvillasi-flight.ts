import { readFileSync } from "node:fs";

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
console.log("pushes", pushes.length);

for (let i = 0; i < pushes.length; i++) {
  const decoded = unescapeFlightString(pushes[i]![1]!);
  const keywords = [
    "prices",
    "price",
    "calendar",
    "availability",
    "period",
    "season",
    "check_in",
    "check_out",
    "5570",
    "12250",
    "blocked",
    "booked",
    "min_stay",
    "damage",
    "villa_id",
    "villaId",
    "mulberry",
    "FİYATLAR",
    "TAKVİM",
  ];
  const hits = keywords.filter((k) => decoded.toLowerCase().includes(k.toLowerCase()));
  if (hits.length === 0) continue;
  console.log(`\n=== push ${i} hits: ${hits.join(", ")} len=${decoded.length} ===`);
  console.log(decoded.slice(0, 2500));
}

// Search raw html for escaped JSON arrays with dates/prices
const datePricePatterns = [
  /check_in\\":\\"[^\\]+\\"/g,
  /check_out\\":\\"[^\\]+\\"/g,
  /price\\":\d+/g,
  /\"price\":\d+/g,
  /start_date\\":\\"[^\\]+\\"/g,
  /end_date\\":\\"[^\\]+\\"/g,
  /baslangic\\":\\"[^\\]+\\"/g,
  /bitis\\":\\"[^\\]+\\"/g,
  /gecelik\\":\\"[^\\]+\\"/g,
  /gecelik\\":\d+/g,
  /nightly\\":\d+/g,
];
for (const re of datePricePatterns) {
  const matches = [...html.matchAll(re)].slice(0, 5);
  if (matches.length) {
    console.log("\nPATTERN", re.source, matches.map((m) => m[0]));
  }
}

// Look for month names with prices in HTML visible table
const monthRe =
  /(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)[^<]{0,120}/gi;
const monthHits = [...html.matchAll(monthRe)].slice(0, 20);
console.log("\nMonth hits", monthHits.length);
for (const m of monthHits) console.log(m[0].replace(/\s+/g, " ").slice(0, 120));
