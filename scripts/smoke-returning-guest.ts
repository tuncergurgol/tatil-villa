/**
 * Dönen misafir tanıma + sadakat indirim tabanı — smoke.
 * Çalıştır: npx tsx scripts/smoke-returning-guest.ts
 */
import {
  buildReturningGuestWelcome,
  firstNameFromFullName,
  higherLoyaltyTier,
  raiseAgencyDiscountForLoyalty,
  shouldAutoApplyLoyaltyDiscount,
  splitFullName,
  toReturningGuestPreview,
} from "../lib/returning-guest-shared";

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`ok — ${label}`);
}

assert(firstNameFromFullName("İRFAN ALP") === "İrfan", "ad unvanı");
assert(splitFullName("İrfan Alp").last === "Alp", "soyad ayrımı");

const silverWelcome = buildReturningGuestWelcome({
  fullName: "İrfan Alp",
  loyaltyTier: "SILVER",
  stayCount: 1,
});
assert(
  silverWelcome.welcomeTitle === "Sizi hatırladık, İrfan",
  "hatırlama başlığı"
);
assert(
  silverWelcome.welcomeBody.includes("Silver") &&
    silverWelcome.welcomeBody.includes("%5"),
  "silver indirim metni"
);

const bronzeWelcome = buildReturningGuestWelcome({
  fullName: "Yeni Misafir",
  loyaltyTier: "BRONZE",
  stayCount: 0,
});
assert(
  bronzeWelcome.welcomeBody.includes("kayıtlı"),
  "bronz ilk kayıt sempatik metin"
);

assert(
  shouldAutoApplyLoyaltyDiscount({ stayCount: 1, loyaltyTier: "SILVER" }) ===
    true,
  "silver otomatik uygulanır"
);
assert(
  shouldAutoApplyLoyaltyDiscount({ stayCount: 0, loyaltyTier: "BRONZE" }) ===
    false,
  "bronz 0 konaklama otomatik uygulanmaz"
);

const raised = raiseAgencyDiscountForLoyalty({
  grossPrice: 20000,
  agencyDiscountRate: 3,
  agencyDiscountAmount: 600,
  loyaltyPercent: 5,
});
assert(raised.raised === true, "3% → 5% yükselir");
assert(raised.agencyDiscountRate === 5, "yeni oran 5");
assert(raised.agencyDiscountAmount === 1000, "20000 * %5 = 1000");

const kept = raiseAgencyDiscountForLoyalty({
  grossPrice: 20000,
  agencyDiscountRate: 10,
  agencyDiscountAmount: 2000,
  loyaltyPercent: 5,
});
assert(kept.raised === false && kept.agencyDiscountRate === 10, "daha yüksek oran düşmez");

assert(higherLoyaltyTier("BRONZE", "SILVER") === "SILVER", "sınıf max silver");
assert(higherLoyaltyTier("GOLD", "SILVER") === "GOLD", "sınıf max gold");

const preview = toReturningGuestPreview({
  fullName: "İrfan Alp",
  firstName: "İrfan",
  email: "irfan@example.com",
  phone: "+905551112233",
  loyaltyTier: "SILVER",
  discountPercent: 5,
  stayCount: 1,
  hasMemberAccount: false,
  memberId: null,
  customerId: "c1",
  welcomeTitle: silverWelcome.welcomeTitle,
  welcomeBody: silverWelcome.welcomeBody,
});
assert(preview.applyDiscount === true, "önizleme applyDiscount");
assert(preview.fullName === undefined, "public önizlemede tam ad yok");

const adminPreview = toReturningGuestPreview(
  {
    fullName: "İrfan Alp",
    firstName: "İrfan",
    email: "irfan@example.com",
    phone: "+905551112233",
    loyaltyTier: "SILVER",
    discountPercent: 5,
    stayCount: 1,
    hasMemberAccount: true,
    memberId: "m1",
    customerId: "c1",
    welcomeTitle: silverWelcome.welcomeTitle,
    welcomeBody: silverWelcome.welcomeBody,
  },
  { includeFullName: true }
);
assert(adminPreview.fullName === "İrfan Alp", "admin önizlemede tam ad var");

console.log("smoke-returning-guest geçti");
