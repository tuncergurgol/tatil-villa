import assert from "node:assert/strict";
import {
  applyCriterionUpdate,
  buildInferredConfirm,
  extractRegionSlugs,
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

console.log("assistant regions smoke ok");
