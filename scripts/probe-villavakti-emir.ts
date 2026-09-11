const url = "https://www.villavakti.com/tr/villa-emir-gocek";
const fs = require("fs");

async function main() {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
  });
  const html = await res.text();
  fs.writeFileSync("scripts/villavakti-emir-sample.html", html);

  for (const needle of [
    "villa_id",
    "daterangepicker",
    "isInvalidDate",
    "dolu",
    "disabled",
    "ajax",
    "getCalendar",
    "rezervation",
    "booked",
    "unavailable",
    "dates:",
    "dateLimit",
  ]) {
    let from = 0;
    let count = 0;
    while (count < 3) {
      const idx = html.toLowerCase().indexOf(needle.toLowerCase(), from);
      if (idx < 0) break;
      console.log(
        `\n=== ${needle} #${count + 1} @${idx} ===\n`,
        html.slice(Math.max(0, idx - 180), idx + 700).replace(/\s+/g, " ")
      );
      from = idx + needle.length;
      count += 1;
    }
  }

  const scripts = [
    ...html.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi),
  ]
    .map((m) => m[1] ?? "")
    .filter((s) => /date|takvim|villa|ajax|dolu|rezerv/i.test(s));
  console.log("\ninline scripts with date/ajax:", scripts.length);
  for (const [i, s] of scripts.entries()) {
    console.log(`\n--- inline ${i} len=${s.length} ---`);
    console.log(s.slice(0, 3000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
