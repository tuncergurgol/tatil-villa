const url = "https://www.airbnb.com.tr/rooms/28117950";

async function main() {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  console.log("status", res.status, res.url);
  const html = await res.text();
  console.log("len", html.length);
  const fs = await import("node:fs");
  fs.writeFileSync(
    new URL("./airbnb-sample.html", import.meta.url),
    html,
    "utf8"
  );

  const patterns = [
    "calendar",
    "availability",
    "PdpAvailability",
    "28117950",
    "booked",
    "blocked",
    "__NEXT_DATA__",
    "niobe",
    "graphql",
    "data-deferred-state",
  ];
  for (const p of patterns) {
    const count = (html.match(new RegExp(p, "gi")) || []).length;
    if (count) console.log(p, count);
  }

  const deferredCount = (html.match(/data-deferred-state/g) || []).length;
  console.log("deferred-state scripts", deferredCount);

  const apiHints = [
    ...html.matchAll(
      /https?:\/\/[^"'\s]+(?:calendar|availability|pdp)[^"'\s]*/gi
    ),
  ].slice(0, 15);
  console.log(
    "api hints",
    apiHints.map((m) => m[0])
  );

  const listingId = html.match(/"listingId"\s*:\s*"?(\d+)"?/);
  console.log("listingId", listingId?.[1]);

  const calendarMonths = html.match(/"calendarMonths"\s*:\s*\[/);
  console.log("calendarMonths in html", Boolean(calendarMonths));

  // Try Airbnb calendar API
  const listing = "28117950";
  const month = "2026-08-01";
  const count = 12;
  const apiUrl = `https://www.airbnb.com.tr/api/v3/PdpAvailabilityCalendar?operationName=PdpAvailabilityCalendar&locale=tr&currency=TRY&variables=${encodeURIComponent(
    JSON.stringify({
      request: {
        count,
        listingId: listing,
        month,
        year: 2026,
      },
    })
  )}&extensions=${encodeURIComponent(
    JSON.stringify({
      persistedQuery: {
        version: 1,
        sha256Hash:
          "8f08e03c8bd62c9642e2b3895f1934f986a2c1d3a522e4e3fea900528ad0ce5",
      },
    })
  )}`;

  const knownHash =
    "b23335819df0dc391a338d665e2ee2f5d3bff19181d05c0b39bc6c5aac403914";
  const apiUrl2 = `https://www.airbnb.com.tr/api/v3/PdpAvailabilityCalendar/${knownHash}?operationName=PdpAvailabilityCalendar&locale=tr&currency=TRY&variables=${encodeURIComponent(
    JSON.stringify({
      request: {
        count: 12,
        listingId: "28117950",
        month: 8,
        year: 2026,
        returnPropertyLevelCalendarIfApplicable: false,
      },
    })
  )}&extensions=${encodeURIComponent(
    JSON.stringify({
      persistedQuery: { version: 1, sha256Hash: knownHash },
    })
  )}`;
  const apiRes2 = await fetch(apiUrl2, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      "x-airbnb-api-key": "d306zoyjsyarp7ifhu67rjxn52tv0t20",
    },
  });
  console.log("api2 status", apiRes2.status);
  const api2Text = await apiRes2.text();
  console.log("api2 head", api2Text.slice(0, 1200));

  const hashes = [
    ...html.matchAll(/sha256Hash":"([a-f0-9]{64})"/gi),
  ].map((m) => m[1]);
  console.log("unique hashes", [...new Set(hashes)].slice(0, 20));

  const ops = [
    ...html.matchAll(/operationName":"([^"]+)"/gi),
  ].map((m) => m[1]);
  console.log("operations", [...new Set(ops)].filter((o) => /calendar|avail|pdp/i.test(o)));

  const deferred = [
    ...html.matchAll(
      /<script type="application\/json" data-deferred-state-[^>]*>([\s\S]*?)<\/script>/g
    ),
  ];
  console.log("deferred json blocks", deferred.length);
  for (const [i, block] of deferred.entries()) {
    const text = block[1] ?? "";
    if (/calendar|availability|booked|blocked/i.test(text)) {
      console.log(`block ${i} calendar-related len`, text.length);
      console.log(text.slice(0, 400));
    }
  }

  const jsUrl =
    "https://a0.muscache.com/airbnb/static/packages/web/tr/frontend/gp-stays-pdp-route/routes/PdpPlatformRoute.1a785fa154.js";
  const jsRes = await fetch(jsUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const js = await jsRes.text();
  console.log("pdp js len", js.length);
  for (const n of [
    "PdpAvailabilityCalendar",
    "AvailabilityCalendar",
    "calendarMonths",
    "StaysPdpAvailability",
  ]) {
    const i = js.indexOf(n);
    console.log("js", n, i);
    if (i >= 0) console.log(js.slice(i, i + 250));
  }
  const hashesInJs = [
    ...js.matchAll(/sha256Hash:"([a-f0-9]{64})"/g),
  ].map((m) => m[1]);
  console.log("js unique hashes", [...new Set(hashesInJs)].length);

  // Try StaysPdpSections bootstrap query from HTML
  const staysIdx = html.indexOf("StaysPdpSections:");
  if (staysIdx >= 0) {
    const raw = html.slice(staysIdx + "StaysPdpSections:".length);
    const end = raw.indexOf(",StaysPdpReviews");
    const jsonText = raw.slice(0, end > 0 ? end : 500);
    try {
      const parsed = JSON.parse(jsonText);
      console.log("StaysPdpSections keys", Object.keys(parsed));
    } catch (e) {
      console.log("StaysPdpSections parse fail", String(e).slice(0, 120));
      console.log(jsonText.slice(0, 300));
    }
  }

  const listingIdStr = "28117950";
  const v2Url = `https://www.airbnb.com.tr/api/v2/calendar_months?listing_id=${listingIdStr}&count=12&month=8&year=2026&_format=for_show`;
  const v2Res = await fetch(v2Url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      "x-airbnb-api-key": "d306zoyjsyarp7ifhu67rjxn52tv0t20",
    },
  });
  console.log("v2 calendar status", v2Res.status);
  const v2Text = await v2Res.text();
  console.log("v2 head", v2Text.slice(0, 800));

  const scriptUrls = [
    ...new Set(
      [
        ...html.matchAll(
          /https:\/\/a0\.muscache\.com\/airbnb\/static\/packages\/web\/[^"']+\.js/g
        ),
      ].map((m) => m[0])
    ),
  ];
  console.log("script urls", scriptUrls.length);
  for (const scriptUrl of scriptUrls) {
    const sRes = await fetch(scriptUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const sJs = await sRes.text();
    if (!/PdpAvailabilityCalendar/i.test(sJs)) continue;
    console.log("found in", scriptUrl);
    const hashMatch = sJs.match(
      /PdpAvailabilityCalendar[\s\S]{0,500}?([a-f0-9]{64})/
    );
    console.log("hash near op", hashMatch?.[1]);
    const alt = sJs.match(
      /([a-f0-9]{64})[\s\S]{0,300}?PdpAvailabilityCalendar/
    );
    console.log("hash before op", alt?.[1]);
  }

  // Try graphql POST without persisted query
  const gqlBody = {
    operationName: "PdpAvailabilityCalendar",
    variables: {
      request: {
        count: 12,
        listingId: "28117950",
        month: 8,
        year: 2026,
      },
    },
    query:
      "query PdpAvailabilityCalendar($request: PdpAvailabilityCalendarRequest!) { pdpAvailabilityCalendar(request: $request) { calendarMonths { month year days { calendarDate available availableForCheckin availableForCheckout minNights maxNights } } } }",
  };
  const gqlRes = await fetch("https://www.airbnb.com.tr/api/v3/PdpAvailabilityCalendar", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-airbnb-api-key": "d306zoyjsyarp7ifhu67rjxn52tv0t20",
    },
    body: JSON.stringify(gqlBody),
  });
  console.log("gql post status", gqlRes.status);
  console.log("gql post head", (await gqlRes.text()).slice(0, 600));
}

main().catch(console.error);
