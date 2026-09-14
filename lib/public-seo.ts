const BRAND_LABELS = [
  "Tatildeyiz",
  "Tatil Villacısı",
  "Balayı Villacısı",
  "Glamping Turkey",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function looksLikeMissingPageText(value: string | null | undefined): boolean {
  const text = (value ?? "").trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  return (
    /\b404\b/.test(normalized) ||
    normalized.includes("kayboldunuz") ||
    normalized.includes("sayfa bulunamadı") ||
    normalized.includes("page not found") ||
    normalized.includes("/img/general/404")
  );
}

export function sanitizePublicSeoTitle(
  rawTitle: string | null | undefined,
  currentBrand: string,
  fallback: string
): string {
  const source = (rawTitle ?? "").trim();
  if (!source || looksLikeMissingPageText(source)) {
    return fallback.trim() || "Sayfa";
  }

  let title = source;
  const labels = [...new Set([currentBrand.trim(), ...BRAND_LABELS].filter(Boolean))];
  let changed = true;
  while (changed) {
    changed = false;
    for (const label of labels) {
      const suffix = new RegExp(`\\s*[|–—\\-:]\\s*${escapeRegExp(label)}\\s*$`, "i");
      if (suffix.test(title) && title.replace(suffix, "").trim().length >= 2) {
        title = title.replace(suffix, "").trim();
        changed = true;
      }
      const prefix = new RegExp(`^${escapeRegExp(label)}\\s*[|–—:\\-]\\s*`, "i");
      if (prefix.test(title) && title.replace(prefix, "").trim().length >= 2) {
        title = title.replace(prefix, "").trim();
        changed = true;
      }
    }
  }

  return title || fallback.trim() || source;
}

export function sanitizePublicSeoDescription(
  rawDescription: string | null | undefined,
  pageTitle: string,
  brandName: string
): string {
  const source = (rawDescription ?? "").replace(/\s+/g, " ").trim();
  if (!source || looksLikeMissingPageText(source)) {
    return `${pageTitle} sayfası — ${brandName}.`;
  }

  const withoutTitleEcho = source.startsWith(pageTitle)
    ? source.slice(pageTitle.length).replace(/^[\s:—\-]+/, "").trim() || source
    : source;

  if (withoutTitleEcho.length <= 168) return withoutTitleEcho;
  const sliced = withoutTitleEcho.slice(0, 168);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function demoteCmsHeadingToH2(html: string): string {
  return html
    .replace(/<h1(\s|>)/gi, "<h2$1")
    .replace(/<\/h1>/gi, "</h2>");
}

export function upgradeInsecureSiteLinks(html: string): string {
  return html.replace(
    /http:\/\/((?:www\.)?(?:tatildeyiz\.com\.tr|tatilvillacisi\.com|balayivillacisi\.com|glampingturkey\.com))/gi,
    "https://$1"
  );
}
