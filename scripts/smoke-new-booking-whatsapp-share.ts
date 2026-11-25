/**
 * Smoke: yeni rezervasyon WhatsApp özet metni.
 * Çalıştır: npx tsx scripts/smoke-new-booking-whatsapp-share.ts
 */
import assert from "node:assert/strict";
import { buildNewBookingWhatsAppShareMessage } from "../lib/new-booking-whatsapp-share";

const message = buildNewBookingWhatsAppShareMessage({
  villaName: "Villa Hayal Duo",
  checkIn: "2026-09-10",
  checkOut: "2026-09-13",
  adults: 1,
  children: 0,
  babies: 0,
  accommodationTotal: 34500,
  agencyDiscountAmount: 2415,
  cleaningFee: 3500,
  reservationTotal: 35585,
  prepaymentAmount: 4485,
  prepaymentRate: 20,
  entrancePayment: 31100,
  damageDeposit: 5000,
});

assert.match(message, /Villa Hayal Duo/);
assert.match(message, /Konaklama \(3 Gece\): 34\.500 TL/);
assert.match(message, /Acente İndirimi: -2\.415 TL/);
assert.match(message, /Toplam: 35\.585 TL/);
assert.match(message, /Ön Ödeme \(%20\): 4\.485 TL/);
assert.doesNotMatch(message, /bont\./i);
assert.doesNotMatch(message, /localhost/i);

console.log("smoke-new-booking-whatsapp-share: OK");
