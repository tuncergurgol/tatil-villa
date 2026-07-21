import { BookingStatus } from "@prisma/client";
import {
  BOOKING_QUICK_FILTER_OPTIONS,
  emptyBookingFilters,
  type BookingFilters,
  type BookingQuickFilter,
} from "@/components/admin/bookings/BookingFilterModal";

const VALID_STATUSES = new Set<string>(Object.values(BookingStatus));
const VALID_QUICK = new Set<string>(
  BOOKING_QUICK_FILTER_OPTIONS.map((option) => option.value)
);

type SearchParamValue = string | string[] | undefined;

function readParam(value: SearchParamValue): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

export function parseBookingFiltersFromUrl(
  params: Record<string, SearchParamValue>
): BookingFilters {
  const filters = emptyBookingFilters();
  const statusRaw = readParam(params.status);
  const quickRaw = readParam(params.quick);

  if (statusRaw && VALID_STATUSES.has(statusRaw)) {
    filters.status = statusRaw as BookingStatus;
  }
  if (quickRaw && VALID_QUICK.has(quickRaw)) {
    filters.quickFilter = quickRaw as BookingQuickFilter;
  }

  return filters;
}

export function buildReservationsHref(input: {
  status?: BookingStatus | null;
  quick?: BookingQuickFilter | null;
}): string {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.quick) params.set("quick", input.quick);
  const query = params.toString();
  return `/admin/rezervasyonlar${query ? `?${query}` : ""}`;
}

export type CallbackListFilter = "all" | "unanswered";

export function parseCallbackListFilterFromUrl(
  params: Record<string, SearchParamValue>
): CallbackListFilter {
  const raw = readParam(params.durum);
  if (raw === "yanitlanmamis") return "unanswered";
  return "all";
}

export function buildCallbackRequestsHref(
  filter: CallbackListFilter
): string {
  if (filter === "unanswered") {
    return "/admin/acente/sizi-arayalim?durum=yanitlanmamis";
  }
  return "/admin/acente/sizi-arayalim";
}
