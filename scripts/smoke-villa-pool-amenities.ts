import assert from "node:assert/strict";
import {
  HEATED_POOL_AMENITY_NAME,
  amenityNamesRequiredByPools,
  amenitiesChanged,
  mergeAmenitiesWithPools,
} from "../lib/villa-pool-amenities";

assert.deepEqual(
  amenityNamesRequiredByPools([
    { poolType: "Özel Havuz", heated: false },
    { poolType: "Çocuk Havuzu", heated: false },
    { poolType: "Kapalı Havuz", heated: true },
  ]),
  ["Özel Havuzlu", "Çocuk Havuzu", "Kapalı Havuz", HEATED_POOL_AMENITY_NAME]
);

assert.deepEqual(
  amenityNamesRequiredByPools([{ poolType: "Ortak Havuz", heated: true }]),
  ["Ortak Havuz", HEATED_POOL_AMENITY_NAME]
);

const merged = mergeAmenitiesWithPools(["Jakuzi", "Özel Havuzlu"], [
  { poolType: "Özel Havuz", heated: false },
  { poolType: "Kapalı Havuz", heated: true },
]);
assert.equal(merged.includes("Jakuzi"), true);
assert.equal(merged.includes("Özel Havuzlu"), true);
assert.equal(merged.includes("Kapalı Havuz"), true);
assert.equal(merged.includes(HEATED_POOL_AMENITY_NAME), true);
assert.equal(merged.filter((name) => name === "Özel Havuzlu").length, 1);

assert.equal(
  amenitiesChanged(["Jakuzi"], ["Jakuzi", "Isıtmalı Havuz"]),
  true
);
assert.equal(amenitiesChanged(["Jakuzi"], ["Jakuzi"]), false);

console.log("smoke-villa-pool-amenities: OK");
