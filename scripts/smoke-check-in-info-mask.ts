/**
 * Giriş bilgilendirme PII maskesi — smoke.
 * Çalıştır: npx tsx scripts/smoke-check-in-info-mask.ts
 */
import {
  CHECK_IN_PII_REVEAL_HOURS,
  applyAddressMask,
  applyPiiMask,
  getCheckInPiiVisibility,
  isCheckInInfoPublicLinkExpired,
  maskPiiKeepFirstTwo,
  resolveCheckInInstant,
} from "../lib/check-in-info-mask";

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`ok — ${label}`);
}

assert(maskPiiKeepFirstTwo("Mehmet") === "Me****", "ad maskeleme");
assert(maskPiiKeepFirstTwo("AB") === "A*", "2 karakter maskeleme");
assert(maskPiiKeepFirstTwo("A") === "A", "1 karakter maskeleme");
assert(maskPiiKeepFirstTwo("05321234567") === "05*********", "telefon maskeleme");
assert(maskPiiKeepFirstTwo("ab@x.com") === "ab******", "mail maskeleme");
assert(maskPiiKeepFirstTwo("12345678901") === "12*********", "TC maskeleme");

assert(applyPiiMask("Mehmet", true) === "Mehmet", "reveal açık ad");
assert(applyPiiMask("Mehmet", false) === "Me****", "reveal kapalı ad");
assert(applyAddressMask("Belceğiz Mah. No:1", true) === "Belceğiz Mah. No:1", "adres açık");
assert(applyAddressMask("Belceğiz Mah. No:1", false) === "Gizli", "adres gizli");

// 14 Tem 2026 16:00 Istanbul = 14 Tem 2026 13:00 UTC
const checkInDate = new Date(Date.UTC(2026, 6, 14));
const checkInInstant = resolveCheckInInstant(checkInDate, "16:00");
assert(
  checkInInstant.toISOString() === "2026-07-14T13:00:00.000Z",
  "Istanbul 16:00 → UTC 13:00"
);

const revealAt = new Date(
  checkInInstant.getTime() - CHECK_IN_PII_REVEAL_HOURS * 60 * 60 * 1000
);

assert(
  getCheckInPiiVisibility({
    checkInDate,
    checkInTime: "16:00",
    now: new Date(revealAt.getTime() - 1),
  }).revealed === false,
  "30 saatten 1 ms önce maskeli"
);

assert(
  getCheckInPiiVisibility({
    checkInDate,
    checkInTime: "16:00",
    now: revealAt,
  }).revealed === true,
  "tam 30 saat kala açık"
);

assert(
  getCheckInPiiVisibility({
    checkInDate,
    checkInTime: "16:00",
    now: new Date(revealAt.getTime() + 1),
  }).revealed === true,
  "30 saatten sonra açık"
);

assert(
  getCheckInPiiVisibility({
    checkInDate,
    checkInTime: "16:00",
    now: checkInInstant,
  }).revealed === true,
  "giriş anında açık"
);

assert(
  getCheckInPiiVisibility({
    checkInDate,
    checkInTime: "16:00",
    now: new Date(checkInInstant.getTime() + 60 * 60 * 1000),
  }).revealed === true,
  "girişten sonra açık"
);

const checkOutDate = new Date(Date.UTC(2026, 7, 20));
assert(
  isCheckInInfoPublicLinkExpired({
    checkOut: checkOutDate,
    now: new Date("2026-08-22T12:00:00+03:00"),
  }) === false,
  "çıkış + 2 gün hâlâ açık"
);
assert(
  isCheckInInfoPublicLinkExpired({
    checkOut: checkOutDate,
    now: new Date("2026-08-23T00:00:00+03:00"),
  }) === true,
  "çıkış + 3 gün kapalı"
);

console.log("\nTüm check-in mask smoke testleri geçti.");
