/**
 * Belgesiz villa rezervasyon erişim token smoke.
 *
 *   npx tsx scripts/smoke-undocumented-booking-access.ts
 */
import {
  appendUndocumentedBookingAccessParam,
  createUndocumentedVillaBookingAccessToken,
  verifyUndocumentedVillaBookingAccessToken,
} from "../lib/undocumented-villa-booking-access";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    process.env.AUTH_SECRET = "smoke-test-secret";
  }

  const villaId = "villa_test_123";
  const token = createUndocumentedVillaBookingAccessToken(villaId, 60);
  assert(token.includes("."), "token should have payload.signature");
  assert(
    verifyUndocumentedVillaBookingAccessToken(token, villaId),
    "valid token should verify"
  );
  assert(
    !verifyUndocumentedVillaBookingAccessToken(token, "other_villa"),
    "token should not verify for other villa"
  );
  assert(
    !verifyUndocumentedVillaBookingAccessToken("tampered." + token.split(".")[1], villaId),
    "tampered payload should fail"
  );

  const url = appendUndocumentedBookingAccessParam(
    "https://www.tatildeyiz.com.tr/villa-x?checkIn=2026-08-27",
    token
  );
  assert(url.includes("&rez="), "url should append rez param");

  const expired = createUndocumentedVillaBookingAccessToken(villaId, -10);
  assert(
    !verifyUndocumentedVillaBookingAccessToken(expired, villaId),
    "expired token should fail"
  );

  console.log("smoke-undocumented-booking-access: OK");
}

main();
