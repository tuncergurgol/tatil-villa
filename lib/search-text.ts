export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function includesSearchText(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(haystack).includes(normalizedQuery);
}
