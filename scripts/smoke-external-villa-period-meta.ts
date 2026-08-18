import assert from "node:assert/strict";
import {
  extractScrapedPeriodDefaults,
  finalizeScrapedPeriods,
  parseAkdenizvillamPriceRows,
  scrapeExternalVillaPage,
} from "../lib/external-villa-page-scrape";
import type { MappedVillaPricePeriod } from "../lib/tatildeyiz-period-import";

async function main() {
const sampleHtml = `
<ul>
  <li>Hasar Depozito : <span data-doviz="tl" data-price="5000">5.000 TL</span></li>
  <li>Kiralama Kaporası : <span>% 50</span></li>
</ul>
<div title="7 gece altındaki kiralamalarda 3.500 ₺ ekstra temizlik ücreti alınır."></div>
`;

const defaults = extractScrapedPeriodDefaults(sampleHtml);
assert.equal(defaults.damageDeposit, 5000);
assert.equal(defaults.prepaymentRate, 50);
assert.equal(defaults.cleaningDayCount, 7);
assert.equal(defaults.cleaningFee, 3500);

const noisyHtml = `
<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"data":{"gece":"3","subTitle":"Minimum 2 gece","sozlesme":"komisyon alma suretiyle"}}}}</script>
<ul>
  <li>Kiralama Kaporası : <span>% 40</span></li>
</ul>
`;
const noisyDefaults = extractScrapedPeriodDefaults(noisyHtml);
assert.equal(noisyDefaults.prepaymentRate, 40);
assert.equal(noisyDefaults.commissionRate, null);

const villavaktiFaqHtml = `
Rezervasyonunuzu tamamlamak için % 20 ön ödeme yapmanız gerekir.
Yurt dışından misafirlerimiz WESTERN UNİON kanalıyla % 20 ön ödemelerini yapabilmektedirler.
Kalan % 80 lik tutar villaya girişte nakit olarak ödenir.
`;
const villavaktiDefaults = extractScrapedPeriodDefaults(villavaktiFaqHtml);
assert.equal(villavaktiDefaults.prepaymentRate, 20);

const basePeriod = {
  sourceId: 1,
  startDate: new Date("2026-06-15"),
  endDate: new Date("2026-09-15"),
  availability: "available" as const,
  nightlyPrice: 17000,
  nightlyPriceCurrency: "TL" as const,
  weeklyPrice: null,
  prepaymentRate: null,
  commissionRate: null,
  nightlyPriceWithoutCommission: null,
  discountedNightlyPrice: 17000,
  minStayNights: 3,
  cleaningDayCount: null,
  cleaningFee: null,
  cleaningFeeCurrency: "TL" as const,
  damageDeposit: null,
  damageDepositCurrency: "TL" as const,
  petCleaningFee: null,
  petCleaningFeeCurrency: "TL" as const,
  petDamageDeposit: null,
  petDamageDepositCurrency: "TL" as const,
  underfloorHeatingFee: null,
  underfloorHeatingFeeCurrency: "TL" as const,
  extraBedFee: null,
  extraBedFeeCurrency: "TL" as const,
  poolHeatingPrivateFee: null,
  poolHeatingPrivateFeeCurrency: "TL" as const,
  poolHeatingIndoorFee: null,
  poolHeatingIndoorFeeCurrency: "TL" as const,
  poolHeatingKidsFee: null,
  poolHeatingKidsFeeCurrency: "TL" as const,
  discount1Rate: null,
  discount2Rate: null,
  extraDiscountAmount: null,
  weekendPrice: null,
  weekendDays: [],
  weekendMinStayNights: null,
  childFee02: null,
  childFee02Currency: "TL" as const,
  childFee03_09: null,
  childFee03_09Currency: "TL" as const,
} satisfies MappedVillaPricePeriod;

const finalized = finalizeScrapedPeriods([basePeriod], sampleHtml);
assert.equal(finalized[0]?.prepaymentRate, 50);
assert.equal(finalized[0]?.damageDeposit, 5000);
assert.equal(finalized[0]?.cleaningFee, 3500);
assert.equal(finalized[0]?.cleaningDayCount, 7);

const weeklyAkdeniz = parseAkdenizvillamPriceRows([
  {
    price: 79950,
    check_in: "2026-07-07",
    check_out: "2026-09-06",
    min_stay: 7,
    pricing_type: 2,
    damage_deposit: 5000,
  },
]);
assert.equal(weeklyAkdeniz.length, 1);
assert.equal(weeklyAkdeniz[0]?.nightlyPrice, 11421);
assert.equal(weeklyAkdeniz[0]?.weeklyPrice, 79950);
assert.equal(weeklyAkdeniz[0]?.minStayNights, 7);

const nightlyAkdeniz = parseAkdenizvillamPriceRows([
  {
    price: 11421,
    check_in: "2026-07-07",
    check_out: "2026-09-06",
    pricing_type: 1,
  },
]);
assert.equal(nightlyAkdeniz[0]?.nightlyPrice, 11421);
assert.equal(nightlyAkdeniz[0]?.weeklyPrice, 79947);

const villacim = await scrapeExternalVillaPage(
  "https://www.villacim.com.tr/villa-tuana-kayakoy"
);
assert.equal(villacim.periods.length > 0, true);
for (const period of villacim.periods) {
  assert.equal(period.cleaningDayCount, 7);
  assert.equal(period.prepaymentRate, null);
  assert.equal(period.commissionRate, null);
}

console.log("smoke-external-villa-period-meta: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
