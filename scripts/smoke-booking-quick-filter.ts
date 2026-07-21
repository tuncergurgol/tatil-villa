import assert from "node:assert/strict";
import {
  addDaysToDateKey,
  getIstanbulDateKey,
  matchesBookingQuickFilter,
  toDbDateKey,
} from "../lib/booking-calendar-days";
import { BookingStatus } from "@prisma/client";

const todayKey = getIstanbulDateKey(new Date("2026-07-21T10:00:00+03:00"));
assert.equal(todayKey, "2026-07-21");

const targetKey = addDaysToDateKey(todayKey, 2);
assert.equal(targetKey, "2026-07-23");

const booking = {
  checkIn: "2026-07-23T00:00:00.000Z",
  checkOut: "2026-07-25T00:00:00.000Z",
  status: BookingStatus.CONFIRMED,
};

assert.equal(toDbDateKey(booking.checkIn), "2026-07-23");
assert.equal(
  matchesBookingQuickFilter(booking, "check_in_2_days"),
  true,
  "UTC midnight check-in should match Istanbul +2 days"
);

assert.equal(
  matchesBookingQuickFilter(
    { ...booking, status: BookingStatus.PREPAYMENT },
    "check_in_2_days"
  ),
  false
);

console.log("smoke-booking-quick-filter: OK");
