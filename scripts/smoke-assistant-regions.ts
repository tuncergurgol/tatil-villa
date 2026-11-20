import assert from "node:assert/strict";
import {
  applyCriterionUpdate,
  buildInferredConfirm,
  extractAmenityNames,
  extractRegionSlugs,
  extractStayDates,
  processFlowStep,
  setAssistantFeatureCatalog,
} from "../lib/tatil-assistant-flow";

const phrase = "kaş veya kalkan 31 aralık 2 ocak 12 kişilik ısıtmalı havuzlu";

assert.deepEqual(extractRegionSlugs(phrase), ["kas", "kalkan"]);
assert.deepEqual(extractRegionSlugs("Kaş ve Kalkan"), ["kas", "kalkan"]);
assert.deepEqual(extractRegionSlugs("kalkan ya da kaş"), ["kalkan", "kas"]);
assert.deepEqual(extractRegionSlugs("kalkan"), ["kalkan"]);

const updated = applyCriterionUpdate(
  {
    guestName: "Vedat",
    helpAsked: true,
    checkIn: "2026-08-01",
    checkOut: "2026-08-08",
    adults: 4,
    children: 0,
    babies: 0,
    countsCollected: true,
    partyKind: "family",
    regionSlugs: ["kalkan"],
    regionTrail: { ilce: { name: "Kalkan", slug: "kalkan" } },
    amenitiesCollected: true,
    phoneCollected: true,
    guestPhone: "+905551112233",
  },
  phrase
);
assert.deepEqual(updated.regionSlugs, ["kas", "kalkan"]);
assert.equal(updated.regionTrail, undefined);

const confirm = buildInferredConfirm("6 y 2 ç kaş veya kalkan");
assert.deepEqual(confirm?.regionSlugs, ["kas", "kalkan"]);
assert.match(confirm?.question ?? "", /Kaş ve Kalkan bölgeleri/);

const monthFirstSpan = extractStayDates("Kasım 20 Aralık 20 arası");
assert.equal(monthFirstSpan?.checkIn.slice(5), "11-20");
assert.equal(monthFirstSpan?.checkOut.slice(5), "12-20");
assert.ok(monthFirstSpan && monthFirstSpan.checkIn < monthFirstSpan.checkOut);

const plainSpan = extractStayDates("kasim 20 aralik 20 arasi");
assert.equal(plainSpan?.checkIn.slice(5), "11-20");
assert.equal(plainSpan?.checkOut.slice(5), "12-20");

const dayFirst = extractStayDates("20 Kasım 20 Aralık");
assert.equal(dayFirst?.checkIn.slice(5), "11-20");
assert.equal(dayFirst?.checkOut.slice(5), "12-20");

const askedDates = processFlowStep("Kasım 20 Aralık 20 arası", {
  guestName: "Vedat",
  helpAsked: true,
});
assert.equal(askedDates.handled, true);
if (askedDates.handled) {
  assert.equal(askedDates.state.checkIn?.slice(5), "11-20");
  assert.equal(askedDates.state.checkOut?.slice(5), "12-20");
  assert.match(askedDates.reply, /Kaç kişilik/);
}

setAssistantFeatureCatalog(["Ocak", "Isıtmalı Havuz", "Isıtmalı Havuzlu Villalar"]);
const winterPhrase = "kaş veya kalkan 31 aralık 2 ocak 2 kişilik ısıtmalı havuzlu";
const winterStay = extractStayDates(winterPhrase);
assert.equal(winterStay?.checkIn.slice(5), "12-31");
assert.equal(winterStay?.checkOut.slice(5), "01-02");
assert.ok(winterStay && winterStay.checkIn < winterStay.checkOut);
assert.deepEqual(extractAmenityNames(winterPhrase), ["Isıtmalı Havuz"]);
assert.deepEqual(extractRegionSlugs(winterPhrase), ["kas", "kalkan"]);

const winterTurn = processFlowStep(winterPhrase, {
  guestName: "Vedat",
  helpAsked: true,
});
assert.equal(winterTurn.handled, true);
if (winterTurn.handled) {
  assert.equal(winterTurn.state.checkIn?.slice(5), "12-31");
  assert.equal(winterTurn.state.checkOut?.slice(5), "01-02");
  assert.equal(winterTurn.state.provisionalGuests, 2);
  assert.deepEqual(winterTurn.state.regionSlugs, ["kas", "kalkan"]);
  assert.deepEqual(winterTurn.state.amenityNames, ["Isıtmalı Havuz"]);
  assert.match(winterTurn.reply, /Aile mi, arkadaş grubu mu/);
  assert.doesNotMatch(winterTurn.reply, /ocak/iu);
}
setAssistantFeatureCatalog([]);

console.log("assistant regions smoke ok");
