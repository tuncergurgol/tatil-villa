import { sanitizePublicBookingDomain } from "@/lib/booking-site-brand";
import { villaPublicPath } from "@/lib/villa-public-path";

export const REPORT_BASE_YEAR = 2026;
export const REPORT_YEAR_COUNT = 6;

export const REPORT_MONTHS = [
  { value: 1, label: "Ocak" },
  { value: 2, label: "Şubat" },
  { value: 3, label: "Mart" },
  { value: 4, label: "Nisan" },
  { value: 5, label: "Mayıs" },
  { value: 6, label: "Haziran" },
  { value: 7, label: "Temmuz" },
  { value: 8, label: "Ağustos" },
  { value: 9, label: "Eylül" },
  { value: 10, label: "Ekim" },
  { value: 11, label: "Kasım" },
  { value: 12, label: "Aralık" },
] as const;

export type MonthlyListingReportRow = {
  agencyLabel: string;
  listingDateRange: string;
  listingNumber: string;
  listingUrl: string;
  listingOwner: string;
  listingAddress: string;
  housingPermitNo: string;
  listingFee: string;
  siteName?: string;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatReportDate(date: Date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function buildMonthDateRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return `${formatReportDate(start)}-${formatReportDate(end)}`;
}

export function getReportYearOptions() {
  return Array.from({ length: REPORT_YEAR_COUNT }, (_, index) => REPORT_BASE_YEAR + index);
}

export function formatAgencyLabel(input: {
  tursabNo: string;
  agencyName: string;
}) {
  const tursabNo = input.tursabNo.trim();
  const agencyName = input.agencyName.trim();

  if (tursabNo && agencyName) {
    return `(${tursabNo}) ${agencyName}`;
  }
  if (agencyName) return agencyName;
  if (tursabNo) return `(${tursabNo})`;
  return "-";
}

export function formatListingUrl(domain: string, slug: string) {
  const host = sanitizePublicBookingDomain(domain);
  const path = villaPublicPath(slug).replace(/^\/+/, "");
  if (host && path) return `${host}/${path}`;
  return host || path;
}

export function getMonthLabel(month: number) {
  return REPORT_MONTHS.find((item) => item.value === month)?.label ?? "";
}
