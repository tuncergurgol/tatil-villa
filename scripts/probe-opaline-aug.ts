import { parseVillavillamAvailability } from "../lib/external-villa-page-scrape";

const URL = "https://www.villavillam.com.tr/villa-opaline";

async function main() {
  const res = await fetch(URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no next data");
  const data = JSON.parse(m[1]!);
  const id = data?.props?.pageProps?.data?.result?.id;
  console.log("entityId", id);

  const apiRes = await fetch(
    `https://api.villavillam.com.tr/Availability?EntityId=${id}&start2=`,
    {
      headers: {
        Origin: "https://www.villavillam.com.tr",
        Referer: URL,
        "User-Agent": "Mozilla/5.0",
      },
    }
  );
  const api = await apiRes.json();
  const aug = (arr: unknown) =>
    Array.isArray(arr)
      ? arr.filter((x) => String(x).startsWith("2026-08"))
      : [];
  console.log("doluGirisler", aug(api.data?.doluGirisler));
  console.log("doluGunler", aug(api.data?.doluGunler));
  console.log("odemeGunler", aug(api.data?.odemeGunler));

  const parsed = parseVillavillamAvailability(api);
  for (let i = 7; i <= 16; i++) {
    const key = `2026-08-${String(i).padStart(2, "0")}`;
    console.log(key, parsed.occupancyByDateKey.get(key) ?? "EMPTY");
  }
}

main().catch(console.error);
