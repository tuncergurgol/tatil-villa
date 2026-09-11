const URL = "https://www.yazvillalari.com/Villa-Bala-duo";

async function main() {
  const res = await fetch(URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  console.log("status", res.status, "len", html.length);

  const needles = [
    "boceksoft",
    "villatarih",
    "fake-calendar",
    "data-id",
    "calendar",
    "pricingTable",
    "yazvillalari",
    "__NEXT_DATA__",
    "price-range",
  ];
  for (const n of needles) {
    const i = html.toLowerCase().indexOf(n.toLowerCase());
    console.log(n, i >= 0 ? i : "-");
  }

  const cal = html.match(/fake-calendar[^>]*data-id=["'](\d+)["']/i);
  console.log("calendar id", cal?.[1]);
  const cal2 = html.match(/id=["']calendar["'][^>]*data-id=["'](\d+)["']/i);
  console.log("calendar2", cal2?.[1]);

  const villaId = cal?.[1] ?? cal2?.[1];
  console.log("using villa id", villaId);

  if (villaId) {
    const body = `id=${encodeURIComponent(villaId)}&doviz=tl`;
    const ajax = await fetch("https://www.yazvillalari.com/ajax/villatarih", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: URL,
      },
      body,
    });
    const text = await ajax.text();
    console.log("ajax status", ajax.status, "len", text.length);
    console.log("ajax head", text.slice(0, 500));
    const parts = text.split("##");
    console.log("parts count", parts.length);
    console.log("giris", parts[0] ?? "");
    console.log("cikis", parts[1] ?? "");
    console.log("dolu", parts[2] ?? "");

    const { parseBoceksoftVillatarihResponse } = await import(
      "../lib/external-villa-page-scrape.ts"
    );
    const occ = parseBoceksoftVillatarihResponse(text);
    const aug = [...occ.entries()]
      .filter(([k]) => k >= "2026-08-08" && k <= "2026-08-22")
      .sort(([a], [b]) => a.localeCompare(b));
    console.log("parsed occupancy aug:");
    for (const [k, v] of aug) console.log(k, v);
  }
}

main().catch(console.error);
