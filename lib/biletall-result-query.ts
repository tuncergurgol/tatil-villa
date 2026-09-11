export function parseBiletallResultQuery(
  searchParams: Record<string, string | string[] | undefined>
) {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value.trim()) {
      query[key] = value;
    }
  }
  return query;
}
