const TATILDEYIZ_BASE = "https://www.tatildeyiz.com.tr";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; TatilVillaImport/1.0)",
  Accept: "text/html,application/xhtml+xml",
};

export function getTatildeyizPageUrl(path: string) {
  const normalized = path.replace(/^\/+/, "");
  return `${TATILDEYIZ_BASE}/${normalized}`;
}

export async function fetchTatildeyizNextData<T = Record<string, unknown>>(
  path: string
): Promise<T> {
  const response = await fetch(getTatildeyizPageUrl(path), {
    headers: FETCH_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status}): ${path}`);
  }

  const html = await response.text();
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error(`__NEXT_DATA__ bulunamadı: ${path}`);
  }

  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf("</script>", jsonStart);
  return JSON.parse(html.slice(jsonStart, jsonEnd)) as T;
}

export function slugifyTurkish(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
