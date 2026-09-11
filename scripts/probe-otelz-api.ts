const UA = { "User-Agent": "Mozilla/5.0" };

async function tryUrl(label: string, url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, { ...init, headers: { ...UA, ...(init?.headers ?? {}) } });
    const text = await res.text();
    console.log(`\n=== ${label} ===`);
    console.log("status", res.status, "len", text.length);
    console.log(text.slice(0, 800));
  } catch (e) {
    console.log(`\n=== ${label} FAIL ===`, e);
  }
}

async function main() {
  const html = await fetch("https://www.otelz.com/", { headers: UA }).then((r) =>
    r.text()
  );
  const chunks = [...html.matchAll(/\/api[^"'\s]{3,120}/g)].map((m) => m[0]);
  console.log("api paths", [...new Set(chunks)].slice(0, 40));

  const nextData = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  )?.[1];
  const buildId = nextData ? JSON.parse(nextData).buildId : null;
  if (buildId) console.log("buildId", buildId);

  const suggestTests = [
    "https://www.otelz.com/api/v1/place/suggest?q=antalya",
    "https://www.otelz.com/api/v1/place/suggest?search=antalya",
    "https://www.otelz.com/api/v1/place/suggest?text=antalya",
    "https://www.otelz.com/api/v1/place/suggest?keyword=antalya",
    "https://www.otelz.com/api/v1/place/suggest?term=antalya",
    "https://www.otelz.com/api/v1/place/suggest?query=antalya&lang=tr",
    "https://www.otelz.com/api/v1/place/suggest?q=antalya&lang=tr",
    "https://www.otelz.com/api/v1/place/suggest?q=antalya&limit=10",
  ];

  for (const url of suggestTests) {
    const res = await fetch(url, {
      headers: {
        ...UA,
        Accept: "application/json",
        Referer: "https://www.otelz.com/",
      },
    });
    const text = await res.text();
    console.log("\n", url, res.status, text.slice(0, 600));
  }

  const buildId2 = buildId;
  if (buildId2) {
    const manifest = await fetch(
      `https://www.otelz.com/_next/static/${buildId}/_buildManifest.js`,
      { headers: UA }
    ).then((r) => r.text());
    const hits = [...manifest.matchAll(/place[^"']{0,40}/gi)].map((m) => m[0]);
    console.log("\nmanifest place hits", [...new Set(hits)].slice(0, 20));
  }

  // fetch a page chunk containing search
  const scriptSrcs = [...html.matchAll(/src=\"(\/_next\/static\/[^\"]+\.js)\"/g)].map(
    (m) => m[1]
  );
  console.log("script count", scriptSrcs.length);
  for (const src of scriptSrcs.slice(0, 8)) {
    const js = await fetch(`https://www.otelz.com${src}`, { headers: UA }).then((r) =>
      r.text()
    );
    if (/place\/suggest|suggest\?q|autocomplete/i.test(js)) {
      console.log("HIT in", src);
      const idx = js.search(/place\/suggest|suggest\?q|autocomplete/i);
      console.log(js.slice(Math.max(0, idx - 80), idx + 200));
    }
  }

  const endpoints = [
    "https://www.otelz.com/api/v1/place/suggest?q=antalya",
    "https://www.otelz.com/api/v1/place/suggest?query=antalya",
    "https://www.otelz.com/api/v1/places/suggest?q=antalya",
    "https://www.otelz.com/api/v1/search/suggest?q=antalya",
    "https://www.otelz.com/api/v1/autocomplete?q=antalya",
    "https://www.otelz.com/api/v1/autocomplete?term=antalya",
    "https://www.otelz.com/api/v1/location/suggest?q=antalya",
    "https://www.otelz.com/api/v1/destination/suggest?q=antalya",
    "https://www.otelz.com/api/v2/search/suggest?q=antalya",
    "https://www.otelz.com/api/v2/place/suggest?q=antalya",
    "https://www.otelz.com/api/place/suggest?q=antalya",
    "https://www.otelz.com/api/search/suggest?term=antalya",
    "https://www.otelz.com/tr/api/v1/place/suggest?q=antalya",
    "https://api.otelz.com/v1/place/suggest?q=antalya",
    "https://api.otelz.com/v2/place/suggest?q=antalya",
    "https://connect.otelz.com/v2/search/suggest?q=antalya",
    "https://connect.otelz.com/data/place/suggest?q=antalya",
    "https://connect.otelz.com/v2/place/suggest?q=antalya",
  ];

  for (const url of endpoints) {
    await tryUrl(url, url);
  }
}

main().catch(console.error);
