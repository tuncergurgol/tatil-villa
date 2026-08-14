const URL =
  "https://www.tatilvillasi.com.tr/villalar/mulberry-collection-violet";

async function main() {
  const rscHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    Accept: "text/x-component",
    RSC: "1",
    "Next-Router-State-Tree":
      '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22slug%22%2C%22villalar%2Fmulberry-collection-violet%22%2C%22c%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D',
  };

  const variants = [
    URL,
    `${URL}?_rsc=1`,
    "https://www.tatilvillasi.com.tr/kiralik-villalar/mulberry-collection-violet",
    "https://www.tatilvillasi.com.tr/kiralik-villalar/mulberry-collection-violet?_rsc=1",
  ];

  for (const u of variants) {
    const res = await fetch(u, { headers: rscHeaders });
    const text = await res.text();
    console.log("\nURL", u, "status", res.status, "len", text.length);
    const terms = [
      "prices_data",
      "availabilitys_data",
      "check_in",
      "check_out",
      "price_period",
      "season",
      "calendar",
      "5570",
      "12250",
      "blocked",
      "booked",
      "musait",
      "dolu",
      "min_stay",
      "damage",
    ];
    for (const t of terms) {
      const c = text.split(t).length - 1;
      if (c > 0) console.log(" ", t, c);
    }
    if (text.includes("check_in")) {
      const idx = text.indexOf("check_in");
      console.log(text.slice(idx - 100, idx + 400));
    }
  }

  // Try backend CDN or panel
  const backendUrls = [
    "https://api.tatilvillasi.com.tr/villa/57/prices",
    "https://api.tatilvillasi.com.tr/villas/57/prices",
    "https://panel.tatilvillasi.com.tr/api/villa/57/prices",
    "https://www.tatilvillasi.com.tr/_next/data/latest/villalar/mulberry-collection-violet.json",
  ];
  for (const u of backendUrls) {
    try {
      const res = await fetch(u, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      const text = await res.text();
      console.log("\nBACKEND", u, res.status, text.slice(0, 300));
    } catch (e) {
      console.log("BACKEND ERR", u);
    }
  }
}

main();
