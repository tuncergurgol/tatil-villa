import type { CalendarPriceTransferRow } from "@/lib/queries/calendar-price-transfer";
import { includesSearchText } from "@/lib/search-text";

export type TriStateFilter = "all" | "yes" | "no";
export type StatusFilter = "all" | "active" | "passive";
export type ReportFilter = "all" | "error" | "updated" | "not_updated";

export type CalendarPriceTransferColumnFilters = {
  villaSearch: string;
  originalNameSearch: string;
  documentNoSearch: string;
  status: StatusFilter;
  whatsapp: TriStateFilter;
  ical: TriStateFilter;
  link1: TriStateFilter;
  link2: TriStateFilter;
  link3: TriStateFilter;
  syncable: TriStateFilter;
  report: ReportFilter;
};

export const emptyCalendarPriceTransferColumnFilters: CalendarPriceTransferColumnFilters =
  {
    villaSearch: "",
    originalNameSearch: "",
    documentNoSearch: "",
    status: "all",
    whatsapp: "all",
    ical: "all",
    link1: "all",
    link2: "all",
    link3: "all",
    syncable: "all",
    report: "all",
  };

function linkUrl(row: CalendarPriceTransferRow, slot: 1 | 2 | 3) {
  return row.links.find((link) => link.slot === slot)?.url.trim() ?? "";
}

function rowHasSyncSource(row: CalendarPriceTransferRow) {
  return Boolean(row.ical?.url.trim()) || row.links.some((link) => link.url.trim());
}

function matchesTriState(value: boolean, filter: TriStateFilter) {
  if (filter === "all") return true;
  return filter === "yes" ? value : !value;
}

export function applyCalendarPriceTransferColumnFilters(
  rows: CalendarPriceTransferRow[],
  filters: CalendarPriceTransferColumnFilters
) {
  return rows.filter((row) => {
    const villaLabel = `${row.villaId ?? ""} ${row.name}`.trim();
    if (
      filters.villaSearch.trim() &&
      !includesSearchText(villaLabel, filters.villaSearch)
    ) {
      return false;
    }

    if (
      filters.originalNameSearch.trim() &&
      !includesSearchText(row.originalName, filters.originalNameSearch)
    ) {
      return false;
    }

    if (
      filters.documentNoSearch.trim() &&
      !includesSearchText(row.documentNo, filters.documentNoSearch)
    ) {
      return false;
    }

    if (filters.status === "active" && !row.active) return false;
    if (filters.status === "passive" && row.active) return false;

    if (!matchesTriState(row.whatsapp.connected, filters.whatsapp)) return false;
    if (!matchesTriState(Boolean(row.ical?.url.trim()), filters.ical)) {
      return false;
    }
    if (!matchesTriState(Boolean(linkUrl(row, 1)), filters.link1)) return false;
    if (!matchesTriState(Boolean(linkUrl(row, 2)), filters.link2)) return false;
    if (!matchesTriState(Boolean(linkUrl(row, 3)), filters.link3)) return false;
    if (!matchesTriState(rowHasSyncSource(row), filters.syncable)) return false;

    if (filters.report === "error" && !row.hasError) return false;
    if (filters.report === "updated" && !row.isUpdated) return false;
    if (filters.report === "not_updated" && row.isUpdated) return false;

    return true;
  });
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function calendarPriceTransferRowsToExcel(
  rows: CalendarPriceTransferRow[]
) {
  return rows.map((row) => {
    const link1 = row.links.find((link) => link.slot === 1);
    const link2 = row.links.find((link) => link.slot === 2);
    const link3 = row.links.find((link) => link.slot === 3);

    return {
      "Villa ID": row.villaId ?? "",
      "Villa Adı": row.name,
      "Villa Orijinal Adı": row.originalName,
      "Belge No": row.documentNo,
      Durum: row.active ? "Aktif" : "Pasif",
      WhatsApp: row.whatsapp.connected ? "Bağlı" : "Bağlı değil",
      "WhatsApp Grup": row.whatsapp.groupName || "",
      iCal: row.ical?.url.trim() ? "Tanımlı" : "Tanımsız",
      "iCal URL": row.ical?.url ?? "",
      "Link 1": link1?.url.trim() ? "Tanımlı" : "Tanımsız",
      "Link 1 URL": link1?.url ?? "",
      "Link 2": link2?.url.trim() ? "Tanımlı" : "Tanımsız",
      "Link 2 URL": link2?.url ?? "",
      "Link 3": link3?.url.trim() ? "Tanımlı" : "Tanımsız",
      "Link 3 URL": link3?.url ?? "",
      "Son Güncelleme": formatDateTime(row.lastSyncedAt),
      "Rapor Durumu": row.hasError
        ? "Hata"
        : row.isUpdated
          ? "Güncellendi"
          : "Güncellenmedi",
      Rapor: row.reportMessage,
    };
  });
}

export async function downloadCalendarPriceTransferExcel(
  rows: CalendarPriceTransferRow[],
  fileName?: string
) {
  const XLSX = await import("xlsx");
  const data = calendarPriceTransferRowsToExcel(rows);
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Takvim Fiyat Aktarim");
  const stamp = new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date())
    .replace(/[.:]/g, "-")
    .replace(/\s+/g, "_");
  XLSX.writeFile(
    workbook,
    fileName ?? `takvim-fiyat-aktarim-${stamp}.xlsx`
  );
}

export function countActiveCalendarPriceTransferFilters(
  filters: CalendarPriceTransferColumnFilters
) {
  let count = 0;
  if (filters.villaSearch.trim()) count += 1;
  if (filters.originalNameSearch.trim()) count += 1;
  if (filters.documentNoSearch.trim()) count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.whatsapp !== "all") count += 1;
  if (filters.ical !== "all") count += 1;
  if (filters.link1 !== "all") count += 1;
  if (filters.link2 !== "all") count += 1;
  if (filters.link3 !== "all") count += 1;
  if (filters.syncable !== "all") count += 1;
  if (filters.report !== "all") count += 1;
  return count;
}
