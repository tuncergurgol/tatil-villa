import assert from "node:assert/strict";
import {
  getTurkeyPublicHolidayTooltip,
  getTurkeyPublicHolidaysForYear,
  isTurkeyPublicHoliday,
  shiftDateKey,
} from "../lib/turkey-public-holidays";
import { buildTurkeyHolidayBlogPosts } from "../lib/turkey-public-holiday-blog-posts";

assert.equal(getTurkeyPublicHolidayTooltip("2026-01-01"), "Yılbaşı");
assert.equal(
  getTurkeyPublicHolidayTooltip("2026-04-23"),
  "Ulusal Egemenlik ve Çocuk Bayramı"
);
assert.match(
  getTurkeyPublicHolidayTooltip("2026-03-20") ?? "",
  /Ramazan Bayramı 1\. Gün/
);
assert.match(
  getTurkeyPublicHolidayTooltip("2026-05-27") ?? "",
  /Kurban Bayramı 1\. Gün/
);
assert.equal(
  getTurkeyPublicHolidayTooltip("2026-03-19"),
  "Ramazan Bayramı Arifesi (yarım gün)"
);
assert.match(
  getTurkeyPublicHolidayTooltip("2027-05-19") ?? "",
  /Atatürk'ü Anma, Gençlik ve Spor Bayramı/
);
assert.match(
  getTurkeyPublicHolidayTooltip("2027-05-19") ?? "",
  /Kurban Bayramı 4\. Gün/
);
assert.equal(isTurkeyPublicHoliday("2026-03-21"), true);
assert.equal(isTurkeyPublicHoliday("2026-03-18"), false);
assert.equal(shiftDateKey("2026-03-20", 2), "2026-03-22");

const year2026 = getTurkeyPublicHolidaysForYear(2026);
assert.ok(year2026.length >= 14, "2026 should include national + religious days");

const year2033 = getTurkeyPublicHolidaysForYear(2033);
assert.ok(
  year2033.some((item) => item.date === "2033-01-02" && item.kind === "RAMADAN"),
  "2033 January Ramadan"
);
assert.ok(
  year2033.some((item) => item.date === "2033-12-23" && item.kind === "RAMADAN"),
  "2033 December Ramadan"
);

const posts = buildTurkeyHolidayBlogPosts();
assert.equal(posts.length, 15 + 9);
assert.ok(posts.some((post) => post.slug === "turkiye-resmi-tatil-gunleri-2026"));
assert.ok(posts.some((post) => post.slug === "turkiye-resmi-tatil-gunleri-2040"));
assert.ok(posts.some((post) => post.slug === "ramazan-bayrami-resmi-tatil-tarihleri"));
assert.ok(posts.every((post) => post.content.includes("<h2>")));

console.log("smoke-turkey-public-holidays: OK");
