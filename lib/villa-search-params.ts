export const VILLA_SEARCH_PAGE_SIZE = 25;

export function buildVillaSearchHref(
  current: Record<string, string | undefined>,
  patch: Record<string, string | null>
) {
  const params = new URLSearchParams();
  const merged: Record<string, string | undefined> = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }

  if (
    patch.page === null &&
    Object.keys(patch).some((key) => key !== "page" && key !== "sort")
  ) {
    delete merged.page;
  }

  for (const [key, value] of Object.entries(merged)) {
    if (!value) continue;
    if (key === "page" && value === "1") continue;
    params.set(key, value);
  }

  const qs = params.toString();
  return qs ? `/villalar?${qs}` : "/villalar";
}

export function parseVillaSearchPage(value: string | undefined) {
  const parsed = parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
