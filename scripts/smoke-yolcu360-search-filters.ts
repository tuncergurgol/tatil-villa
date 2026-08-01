import assert from "node:assert/strict";
import { parseCarRules } from "../lib/yolcu360/car-rules";
import {
  applyCarSearchFilters,
  buildSearchFacets,
  parseFilterParams,
  serializeFilterParams,
  sortCarResults,
} from "../lib/yolcu360/search-filters";
import type { Yolcu360CarResult } from "../lib/yolcu360/types";

const mockCars: Yolcu360CarResult[] = [
  {
    code: "A1",
    searchID: "S1",
    brand: { name: "Fiat" },
    model: { name: "Egea" },
    class: { name: "Ekonomi" },
    transmission: { name: "Manuel" },
    fuel: { name: "Dizel" },
    seatCount: 5,
    vendor: { displayName: "Avis" },
    rentalDurationInDays: 3,
    pricing: { paymentTotal: { amount: 450000, currency: "TRY" } },
    rules: [
      { type: "deposit", value: 500000 },
      { type: "dailyKm", value: 300 },
    ],
    appointment: { checkInOffice: { name: "İstanbul Havalimanı" } },
  },
  {
    code: "B1",
    searchID: "S1",
    brand: { name: "Renault" },
    model: { name: "Clio" },
    class: { name: "Ekonomi" },
    transmission: { name: "Otomatik" },
    fuel: { name: "Benzin" },
    seatCount: 5,
    vendor: { displayName: "Garenta" },
    rentalDurationInDays: 3,
    pricing: { paymentTotal: { amount: 520000, currency: "TRY" } },
    rules: [{ type: "dailyKm", value: 500 }],
  },
  {
    code: "C1",
    searchID: "S1",
    brand: { name: "BMW" },
    model: { name: "3 Serisi" },
    class: { name: "Prestij" },
    transmission: { name: "Otomatik" },
    fuel: { name: "Dizel" },
    seatCount: 5,
    vendor: { displayName: "Sixt" },
    rentalDurationInDays: 3,
    pricing: { paymentTotal: { amount: 1200000, currency: "TRY" } },
    rules: [{ type: "dailyKm", value: 0 }],
  },
];

const rules = parseCarRules(mockCars[0]!);
assert.equal(rules.depositLabel, "5.000,00 TRY");
assert.equal(rules.kmLabel, "300 km/gün");
assert.equal(rules.pickupOfficeName, "İstanbul Havalimanı");

const unlimited = parseCarRules(mockCars[2]!);
assert.equal(unlimited.kmLabel, "Sınırsız");

const filters = parseFilterParams({
  pickupPlaceId: "p1",
  checkInDate: "2026-08-01",
  tx: "Manuel,Otomatik",
  brand: "Fiat",
  sb: "highest_price_first",
});

assert.deepEqual(filters.transmission, ["Manuel", "Otomatik"]);
assert.equal(filters.brand[0], "Fiat");
assert.equal(filters.sortBy, "highest_price_first");

const serialized = serializeFilterParams(
  {
    pickupPlaceId: "p1",
    checkInDate: "2026-08-01",
    checkOutDate: "2026-08-04",
  },
  filters
);
assert.equal(serialized.pickupPlaceId, "p1");
assert.equal(serialized.tx, "Manuel,Otomatik");
assert.equal(serialized.sb, "highest_price_first");
assert.equal(serialized.class, undefined);

const transmissionFiltered = applyCarSearchFilters(mockCars, {
  ...filters,
  transmission: ["Manuel"],
  brand: [],
  model: [],
  fuel: [],
  carClass: [],
  vendor: [],
  seats: [],
  priceMin: null,
  priceMax: null,
  km: [],
  deposit: [],
  delivery: [],
});
assert.equal(transmissionFiltered.length, 1);
assert.equal(transmissionFiltered[0]?.code, "A1");

const priceFiltered = applyCarSearchFilters(mockCars, {
  ...filters,
  transmission: [],
  brand: [],
  priceMin: 500000,
  priceMax: 1000000,
});
assert.equal(priceFiltered.length, 1);
assert.equal(priceFiltered[0]?.code, "B1");

const facets = buildSearchFacets(mockCars, {
  ...filters,
  transmission: [],
  brand: [],
});
assert.ok(facets.transmission.some((item) => item.value === "Manuel" && item.count === 1));
assert.ok(facets.brand.length >= 3);

const sorted = sortCarResults(mockCars, "lowest_price_first");
assert.equal(sorted[0]?.code, "A1");
assert.equal(sorted.at(-1)?.code, "C1");

const sortedDesc = sortCarResults(mockCars, "highest_price_first");
assert.equal(sortedDesc[0]?.code, "C1");

const sortedVendor = sortCarResults(mockCars, "vendor_az");
assert.equal(sortedVendor[0]?.code, "A1");
assert.equal(sortedVendor[1]?.code, "B1");
assert.equal(sortedVendor[2]?.code, "C1");

const vendorSortRoundTrip = parseFilterParams({ sb: "vendor_az" });
assert.equal(vendorSortRoundTrip.sortBy, "vendor_az");

console.log("smoke-yolcu360-search-filters: OK");
