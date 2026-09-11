const PAGE =
  "https://www.tatilvillasi.com.tr/villalar/mulberry-collection-violet";

async function main() {
  const html = await fetch(PAGE, {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());

  const scripts = [
    ...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g),
  ].map((m) => m[1]!);

  console.log("scripts", scripts.length);

  for (const script of scripts) {
    const js = await fetch(`https://www.tatilvillasi.com.tr${script}`).then(
      (r) => r.text()
    );
    const apiHits = [
      ...js.matchAll(/\/api\/[a-zA-Z0-9_\-/?=&.]+/g),
    ].map((m) => m[0]);
    const uniqApis = [...new Set(apiHits)];
    const urlHits = [
      ...js.matchAll(/https?:\/\/[a-zA-Z0-9._\-/]+/g),
    ]
      .map((m) => m[0])
      .filter((u) => /api|price|calendar|avail|villa/i.test(u));
    const uniqUrls = [...new Set(urlHits)];

    if (uniqApis.length || uniqUrls.length) {
      console.log("\nSCRIPT", script);
      if (uniqApis.length) console.log(" apis", uniqApis.slice(0, 30));
      if (uniqUrls.length) console.log(" urls", uniqUrls.slice(0, 30));
    }

    for (const term of [
      "seasonPrices",
      "pricePeriods",
      "calendarData",
      "availabilityData",
      "blockedDates",
      "bookedDates",
      "dailyPrices",
      "getPrices",
      "getCalendar",
      "periyot",
      "musait",
    ]) {
      if (js.includes(term)) {
        const idx = js.indexOf(term);
        console.log("TERM", script, term, js.slice(idx - 80, idx + 200));
      }
    }
  }
}

main();
