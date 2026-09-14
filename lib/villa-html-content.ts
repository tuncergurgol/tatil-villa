function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 10))
    );
}

function containsHtmlTags(value: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(value);
}

function looksEntityEncodedHtml(value: string): boolean {
  return /&lt;(?:\/)?(?:p|strong|em|br|ul|ol|li|h[1-6]|div|span)\b/i.test(
    value
  );
}

/** Admin / AI kaynaklı açıklamayı görüntüleme için normalize eder. */
export function normalizeVillaDescriptionHtml(raw: string): string {
  let value = raw?.trim() ?? "";
  if (!value) return "";

  if (looksEntityEncodedHtml(value)) {
    value = decodeHtmlEntities(value);
  }

  return value;
}

/** XSS riskini azaltmak için temel temizlik (admin kaynaklı HTML). */
export function sanitizeVillaDescriptionHtml(raw: string): string {
  const normalized = normalizeVillaDescriptionHtml(raw);
  if (!normalized) return "";

  return normalized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function villaDescriptionLooksLikeHtml(raw: string): boolean {
  return containsHtmlTags(normalizeVillaDescriptionHtml(raw));
}

/** Form kaydı öncesi açıklamayı standartlaştırır. */
export function normalizeVillaDescriptionForStorage(raw: string): string {
  return sanitizeVillaDescriptionHtml(raw);
}
