import assert from "node:assert/strict";
import {
  extractAmenityNames,
  setAssistantFeatureCatalog,
} from "../lib/tatil-assistant-flow";
import { GENERIC_POOL_REQUEST } from "../lib/villa-pool-amenities";
import { buildAssistantLookingMessage } from "../lib/tatil-assistant-format";

setAssistantFeatureCatalog([
  "Çocuk Havuzu",
  "Çocuk Havuzlu Villalar",
  "Özel Havuzlu",
  "Özel Havuzlu Villalar",
  "Kapalı Havuz",
  "Kapalı Havuzlu Villalar",
  "Ortak Havuz",
  "Isıtmalı Havuz",
  "Jakuzi",
]);

assert.deepEqual(extractAmenityNames("havuz"), [GENERIC_POOL_REQUEST]);
assert.deepEqual(extractAmenityNames("havuzu"), [GENERIC_POOL_REQUEST]);
const childPool = extractAmenityNames("çocuk havuzu");
assert.ok(childPool.includes("Çocuk Havuzu"));
assert.ok(!childPool.includes(GENERIC_POOL_REQUEST));
const privatePool = extractAmenityNames("özel havuz");
assert.ok(privatePool.includes("Özel Havuzlu"));
assert.ok(!privatePool.includes(GENERIC_POOL_REQUEST));
assert.ok(extractAmenityNames("kapalı havuz").includes("Kapalı Havuz"));
assert.ok(extractAmenityNames("ortak havuz").includes("Ortak Havuz"));
assert.deepEqual(extractAmenityNames("4 yetişkin"), []);

assert.equal(
  buildAssistantLookingMessage({
    regionNames: ["İzmir"],
    amenityNames: [GENERIC_POOL_REQUEST],
  }),
  "İzmir’de havuzlu seçenekleri inceliyorum, uygun olanları size sunacağım."
);

console.log("smoke-generic-pool-request: OK");
