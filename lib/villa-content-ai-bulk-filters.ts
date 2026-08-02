import type { VillaContentAiBulkRow } from "@/lib/queries/villa-content-ai-bulk";
import { includesSearchText } from "@/lib/search-text";

export type TriStateFilter = "all" | "yes" | "no";

export type VillaContentAiColumnFilters = {
  villaSearch: string;
  description: TriStateFilter;
  seoTitle: TriStateFilter;
  seoKeywords: TriStateFilter;
  seoDescription: TriStateFilter;
  report: TriStateFilter;
};

export const emptyVillaContentAiColumnFilters: VillaContentAiColumnFilters = {
  villaSearch: "",
  description: "all",
  seoTitle: "all",
  seoKeywords: "all",
  seoDescription: "all",
  report: "all",
};

function matchesTriState(value: boolean, filter: TriStateFilter) {
  if (filter === "all") return true;
  return filter === "yes" ? value : !value;
}

export function applyVillaContentAiColumnFilters(
  rows: VillaContentAiBulkRow[],
  filters: VillaContentAiColumnFilters
) {
  return rows.filter((row) => {
    const villaLabel = `${row.villaId ?? ""} ${row.name}`.trim();
    if (
      filters.villaSearch.trim() &&
      !includesSearchText(villaLabel, filters.villaSearch)
    ) {
      return false;
    }

    if (!matchesTriState(row.hasDescription, filters.description)) return false;
    if (!matchesTriState(row.hasSeoTitle, filters.seoTitle)) return false;
    if (!matchesTriState(row.hasSeoKeywords, filters.seoKeywords)) return false;
    if (!matchesTriState(row.hasSeoDescription, filters.seoDescription)) {
      return false;
    }

    const hasReport = Boolean(
      row.descriptionAiUpdatedAt || row.seoAiUpdatedAt || row.lastReportMessage
    );
    if (!matchesTriState(hasReport, filters.report)) return false;

    return true;
  });
}

export function countActiveVillaContentAiFilters(
  filters: VillaContentAiColumnFilters
) {
  let count = 0;
  if (filters.villaSearch.trim()) count += 1;
  if (filters.description !== "all") count += 1;
  if (filters.seoTitle !== "all") count += 1;
  if (filters.seoKeywords !== "all") count += 1;
  if (filters.seoDescription !== "all") count += 1;
  if (filters.report !== "all") count += 1;
  return count;
}

export function filtersForEmptyContentFields(): VillaContentAiColumnFilters {
  return {
    ...emptyVillaContentAiColumnFilters,
    description: "no",
    seoTitle: "no",
    seoKeywords: "no",
    seoDescription: "no",
  };
}
