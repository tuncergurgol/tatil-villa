import { dbDateToDateKey } from "@/lib/villa-period-calendar";
import { getStayNightKeys } from "@/lib/stay-quote";

function toStayDateKey(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return dbDateToDateKey(value);
}

export function calculateNights(checkIn: Date, checkOut: Date) {
  return getStayNightKeys(toStayDateKey(checkIn), toStayDateKey(checkOut))
    .length;
}
