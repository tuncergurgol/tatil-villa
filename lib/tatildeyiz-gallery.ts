const TATILDEYIZ_BASE_URL = "https://www.tatildeyiz.com.tr";
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; TatilVillaImageImport/1.0)",
  Accept: "text/html,application/xhtml+xml",
};

type TatildeyizPropertyImage = {
  id: number;
  url: string;
  order: number;
};

type TatildeyizPageProps = {
  tesis?: {
    propertyImages?: TatildeyizPropertyImage[];
  };
};

export function parseTatildeyizGalleryUrlsFromHtml(html: string): string[] {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error("__NEXT_DATA__ bulunamadı");
  }

  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf("</script>", jsonStart);
  if (jsonEnd === -1) {
    throw new Error("__NEXT_DATA__ JSON kapanışı bulunamadı");
  }

  const data = JSON.parse(html.slice(jsonStart, jsonEnd)) as {
    props?: { pageProps?: TatildeyizPageProps };
  };

  const images = data.props?.pageProps?.tesis?.propertyImages ?? [];
  if (images.length === 0) {
    throw new Error("propertyImages boş");
  }

  const sorted = [...images].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id - b.id;
  });

  const seen = new Set<string>();
  const urls: string[] = [];

  for (const image of sorted) {
    const url = image.url?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}

export function getTatildeyizVillaPageUrl(slug: string) {
  return `${TATILDEYIZ_BASE_URL}/${slug.replace(/^\/+/, "")}`;
}

export async function fetchTatildeyizGalleryUrls(slug: string): Promise<string[]> {
  const response = await fetch(getTatildeyizVillaPageUrl(slug), {
    headers: FETCH_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status}): ${slug}`);
  }

  const html = await response.text();
  return parseTatildeyizGalleryUrlsFromHtml(html);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
