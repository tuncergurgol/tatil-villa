import type { BookingQuickFilter } from "@/lib/booking-filter-types";
import { BookingStatus } from "@prisma/client";
import { dateKeyToDbDate } from "@/lib/villa-period-calendar";

export const BOOKING_BUSINESS_TIMEZONE = "Europe/Istanbul";

export function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return startOfDay(value);
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** İş günü takvimi (Türkiye) için YYYY-MM-DD */
export function getIstanbulDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_BUSINESS_TIMEZONE,
  }).format(date);
}

/**
 * Prisma @db.Date alanından okunan tarihin mantıksal günü.
 * dateKeyToDbDate ile yazıldığı için UTC bileşenleri kullanılır.
 */
export function toDbDateKey(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return toDbDateKey(utc);
}

export function resolveQuickFilterTargetDateKey(
  quickFilter: BookingQuickFilter
): string {
  const todayKey = getIstanbulDateKey();

  switch (quickFilter) {
    case "check_in_today":
    case "check_out_today":
      return todayKey;
    case "check_in_1_day":
    case "check_out_1_day":
      return addDaysToDateKey(todayKey, 1);
    case "check_in_2_days":
    case "check_out_2_days":
      return addDaysToDateKey(todayKey, 2);
    default:
      return todayKey;
  }
}

export function resolveQuickFilterPrismaDate(
  quickFilter: BookingQuickFilter
): Date {
  return dateKeyToDbDate(resolveQuickFilterTargetDateKey(quickFilter));
}

export function matchesBookingQuickFilter(
  booking: {
    checkIn: Date | string;
    checkOut: Date | string;
    status: BookingStatus;
  },
  quickFilter: BookingQuickFilter | null
): boolean {
  if (!quickFilter) return true;
  if (booking.status !== BookingStatus.CONFIRMED) return false;

  const targetKey = resolveQuickFilterTargetDateKey(quickFilter);
  const field = quickFilter.startsWith("check_in") ? "checkIn" : "checkOut";
  return toDbDateKey(booking[field]) === targetKey;
}
