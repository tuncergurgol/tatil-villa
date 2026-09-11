import assert from "node:assert/strict";
import {
  addDaysToDateKey,
  getIstanbulDateKey,
  getYesterdayIstanbulDateKey,
  matchesBookingQuickFilter,
  toDbDateKey,
} from "../lib/booking-calendar-days";
import { BookingStatus } from "@prisma/client";

const frozenToday = getIstanbulDateKey(new Date("2026-07-21T10:00:00+03:00"));
assert.equal(frozenToday, "2026-07-21");
assert.equal(addDaysToDateKey(frozenToday, 2), "2026-07-23");
assert.equal(
  getYesterdayIstanbulDateKey(new Date("2026-07-21T10:00:00+03:00")),
  "2026-07-20"
);
assert.equal(
  addDaysToDateKey("2026-08-01", -1),
  "2026-07-31",
  "month boundary yesterday"
);

const todayKey = getIstanbulDateKey();
const inTwoDaysKey = addDaysToDateKey(todayKey, 2);
const yesterdayKey = addDaysToDateKey(todayKey, -1);

const bookingInTwoDays = {
  checkIn: `${inTwoDaysKey}T00:00:00.000Z`,
  checkOut: `${addDaysToDateKey(inTwoDaysKey, 2)}T00:00:00.000Z`,
  status: BookingStatus.CONFIRMED,
};

assert.equal(toDbDateKey(bookingInTwoDays.checkIn), inTwoDaysKey);
assert.equal(
  matchesBookingQuickFilter(bookingInTwoDays, "check_in_2_days"),
  true,
  "UTC midnight check-in should match Istanbul +2 days"
);

assert.equal(
  matchesBookingQuickFilter(
    { ...bookingInTwoDays, status: BookingStatus.PREPAYMENT },
    "check_in_2_days"
  ),
  false
);

assert.equal(
  matchesBookingQuickFilter(
    {
      checkIn: `${yesterdayKey}T00:00:00.000Z`,
      checkOut: `${addDaysToDateKey(yesterdayKey, 3)}T00:00:00.000Z`,
      status: BookingStatus.CONFIRMED,
    },
    "check_in_yesterday"
  ),
  true,
  "yesterday check-in matches giriş gününden 1 gün sonra"
);

assert.equal(
  matchesBookingQuickFilter(
    {
      checkIn: `${todayKey}T00:00:00.000Z`,
      checkOut: `${addDaysToDateKey(todayKey, 3)}T00:00:00.000Z`,
      status: BookingStatus.CONFIRMED,
    },
    "check_in_yesterday"
  ),
  false,
  "today check-in must not match yesterday filter"
);

console.log("smoke-booking-quick-filter: OK");
