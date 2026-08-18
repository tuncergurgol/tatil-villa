import { includesSearchText } from "@/lib/search-text";

export type VillaListStatusFilter = "all" | "active" | "passive";
export type VillaListTypeFilter = "all" | "villa" | "apart" | "suit_daire";

export type VillaListSearchFields = {
  name?: string | null;
  originalName?: string | null;
  documentNo?: string | null;
};

function compactSearchValue(value: string) {
  return value.replace(/[\s\-./]/g, "");
}

export function matchesVillaListSearch(
  villa: VillaListSearchFields,
  query: string
) {
  if (!query.trim()) return true;

  if (
    [villa.name, villa.originalName, villa.documentNo].some((value) =>
      includesSearchText(value ?? "", query)
    )
  ) {
    return true;
  }

  const compactQuery = compactSearchValue(query);
  if (!compactQuery) return false;

  return includesSearchText(
    compactSearchValue(villa.documentNo ?? ""),
    compactQuery
  );
}

export type VillaListFilters = {
  q: string;
  regions: string[];
  type: VillaListTypeFilter;
  status: VillaListStatusFilter;
};

export const VILLA_LIST_FILTER_KEYS = ["q", "region", "type", "status"] as const;

type SearchParamsLike = Pick<URLSearchParams, "get">;

export function parseVillaListFilters(
  params: SearchParamsLike
): VillaListFilters {
  const type = params.get("type");
  const status = params.get("status");
  const regionParam = params.get("region");

  return {
    q: params.get("q") ?? "",
    regions:
      regionParam && regionParam !== "all"
        ? regionParam
            .split(",")
            .map((slug) => slug.trim())
            .filter(Boolean)
        : [],
    type:
      type === "villa" || type === "apart" || type === "suit_daire"
        ? type
        : "all",
    status:
      status === "all" || status === "active" || status === "passive"
        ? status
        : "active",
  };
}

export function buildVillaListSearchParams(
  filters: VillaListFilters
): URLSearchParams {
  const params = new URLSearchParams();
  const q = filters.q.trim();

  if (q) params.set("q", q);
  if (filters.regions.length > 0) {
    params.set("region", filters.regions.join(","));
  }
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.status !== "active") params.set("status", filters.status);

  return params;
}

export function buildVillaListPath(filters: VillaListFilters): string {
  const query = buildVillaListSearchParams(filters).toString();
  return query ? `/admin/villalar?${query}` : "/admin/villalar";
}

export function pickVillaListQueryString(params: SearchParamsLike): string {
  const next = new URLSearchParams();

  for (const key of VILLA_LIST_FILTER_KEYS) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }

  return next.toString();
}

export function appendVillaListQuery(basePath: string, queryString: string): string {
  if (!queryString) return basePath;

  const questionIndex = basePath.indexOf("?");
  const path = questionIndex === -1 ? basePath : basePath.slice(0, questionIndex);
  const merged = new URLSearchParams(
    questionIndex === -1 ? undefined : basePath.slice(questionIndex + 1)
  );

  for (const [key, value] of new URLSearchParams(queryString)) {
    merged.set(key, value);
  }

  const query = merged.toString();
  return query ? `${path}?${query}` : path;
}
