const IGNORED_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
]);

export function hasBiletallResultContext(
  searchParams: Record<string, string | string[] | undefined>
) {
  return Object.keys(searchParams).some(
    (key) => !IGNORED_QUERY_KEYS.has(key.toLowerCase())
  );
}
