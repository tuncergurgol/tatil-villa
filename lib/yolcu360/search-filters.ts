import {
  CAR_RULE_UNKNOWN,
  getCarDeliveryFacetKey,
  getCarDepositFacetKey,
  getCarKmFacetKey,
} from "@/lib/yolcu360/car-rules";
import type { Yolcu360CarResult } from "@/lib/yolcu360/types";

export type CarSearchSortBy =
  | "lowest_price_first"
  | "highest_price_first"
  | "brand_az";

export type CarSearchFilterState = {
  sortBy: CarSearchSortBy;
  transmission: string[];
  fuel: string[];
  carClass: string[];
  brand: string[];
  model: string[];
  vendor: string[];
  seats: number[];
  priceMin: number | null;
  priceMax: number | null;
  km: string[];
  deposit: string[];
  delivery: string[];
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type CarSearchFacets = {
  transmission: FacetOption[];
  fuel: FacetOption[];
  carClass: FacetOption[];
  brand: FacetOption[];
  model: FacetOption[];
  vendor: FacetOption[];
  seats: FacetOption[];
  km: FacetOption[];
  deposit: FacetOption[];
  delivery: FacetOption[];
  priceRange: { min: number; max: number };
};

export const DEFAULT_CAR_SEARCH_FILTERS: CarSearchFilterState = {
  sortBy: "lowest_price_first",
  transmission: [],
  fuel: [],
  carClass: [],
  brand: [],
  model: [],
  vendor: [],
  seats: [],
  priceMin: null,
  priceMax: null,
  km: [],
  deposit: [],
  delivery: [],
};

export const CAR_SEARCH_BASE_PARAM_KEYS = new Set([
  "pickupPlaceId",
  "returnPlaceId",
  "checkInDate",
  "checkInTime",
  "checkOutDate",
  "checkOutTime",
  "age",
  "sameLocation",
]);

const FILTER_PARAM_KEYS = {
  sortBy: "sb",
  transmission: "tx",
  fuel: "fuel",
  carClass: "class",
  brand: "brand",
  model: "model",
  vendor: "vendor",
  seats: "seats",
  priceMin: "priceMin",
  priceMax: "priceMax",
  km: "km",
  deposit: "deposit",
  delivery: "delivery",
} as const;

type FilterCategory = Exclude<keyof CarSearchFilterState, "sortBy" | "priceMin" | "priceMax">;

const ARRAY_FILTER_CATEGORIES: FilterCategory[] = [
  "transmission",
  "fuel",
  "carClass",
  "brand",
  "model",
  "vendor",
  "seats",
  "km",
  "deposit",
  "delivery",
];

export function getCarTotalPrice(car: Yolcu360CarResult): number | null {
  const total = car.pricing?.paymentTotal ?? car.pricing?.total;
  if (!total || !Number.isFinite(total.amount)) return null;
  return total.amount;
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, "tr", { sensitivity: "base" });
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort(compareStrings);
}

function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseSeatCsv(value: string | undefined): number[] {
  return parseCsv(value)
    .map((part) => Number(part))
    .filter((num) => Number.isFinite(num) && num > 0);
}

function serializeCsv(values: Array<string | number>) {
  return values.join(",");
}

function matchesArrayFilter<T>(selected: T[], value: T | null | undefined) {
  if (selected.length === 0) return true;
  if (value == null) return false;
  return selected.includes(value);
}

function matchesStringFilter(selected: string[], value: string | null | undefined) {
  if (selected.length === 0) return true;
  if (!value) return selected.includes(CAR_RULE_UNKNOWN);
  return selected.includes(value);
}

function matchesPriceFilter(
  car: Yolcu360CarResult,
  priceMin: number | null,
  priceMax: number | null
) {
  const price = getCarTotalPrice(car);
  if (price == null) return priceMin == null && priceMax == null;
  if (priceMin != null && price < priceMin) return false;
  if (priceMax != null && price > priceMax) return false;
  return true;
}

function getCarField(
  car: Yolcu360CarResult,
  category: FilterCategory
): string | number | null {
  switch (category) {
    case "transmission":
      return car.transmission?.name?.trim() || null;
    case "fuel":
      return car.fuel?.name?.trim() || null;
    case "carClass":
      return car.class?.name?.trim() || null;
    case "brand":
      return car.brand?.name?.trim() || null;
    case "model":
      return car.model?.name?.trim() || null;
    case "vendor":
      return car.vendor?.displayName?.trim() || car.vendor?.name?.trim() || null;
    case "seats":
      return car.seatCount ?? null;
    case "km":
      return getCarKmFacetKey(car);
    case "deposit":
      return getCarDepositFacetKey(car);
    case "delivery":
      return getCarDeliveryFacetKey(car);
    default:
      return null;
  }
}

function applyFiltersExcept(
  results: Yolcu360CarResult[],
  filters: CarSearchFilterState,
  exclude: FilterCategory | "price" | null
) {
  return results.filter((car) => {
    if (
      exclude !== "transmission" &&
      !matchesStringFilter(filters.transmission, getCarField(car, "transmission") as string | null)
    ) {
      return false;
    }
    if (
      exclude !== "fuel" &&
      !matchesStringFilter(filters.fuel, getCarField(car, "fuel") as string | null)
    ) {
      return false;
    }
    if (
      exclude !== "carClass" &&
      !matchesStringFilter(filters.carClass, getCarField(car, "carClass") as string | null)
    ) {
      return false;
    }
    if (
      exclude !== "brand" &&
      !matchesStringFilter(filters.brand, getCarField(car, "brand") as string | null)
    ) {
      return false;
    }
    if (
      exclude !== "model" &&
      !matchesStringFilter(filters.model, getCarField(car, "model") as string | null)
    ) {
      return false;
    }
    if (
      exclude !== "vendor" &&
      !matchesStringFilter(filters.vendor, getCarField(car, "vendor") as string | null)
    ) {
      return false;
    }
    if (
      exclude !== "seats" &&
      !matchesArrayFilter(filters.seats, getCarField(car, "seats") as number | null)
    ) {
      return false;
    }
    if (
      exclude !== "km" &&
      !matchesStringFilter(filters.km, getCarField(car, "km") as string | null)
    ) {
      return false;
    }
    if (
      exclude !== "deposit" &&
      !matchesStringFilter(filters.deposit, getCarField(car, "deposit") as string | null)
    ) {
      return false;
    }
    if (
      exclude !== "delivery" &&
      !matchesStringFilter(filters.delivery, getCarField(car, "delivery") as string | null)
    ) {
      return false;
    }
    if (exclude !== "price" && !matchesPriceFilter(car, filters.priceMin, filters.priceMax)) {
      return false;
    }
    return true;
  });
}

function buildFacetOptions(
  results: Yolcu360CarResult[],
  category: FilterCategory,
  selectedBrands: string[]
): FacetOption[] {
  const counts = new Map<string, number>();

  for (const car of results) {
    if (category === "model" && selectedBrands.length > 0) {
      const brand = car.brand?.name?.trim();
      if (!brand || !selectedBrands.includes(brand)) continue;
    }

    const raw = getCarField(car, category);
    const value =
      category === "seats"
        ? raw != null
          ? String(raw)
          : CAR_RULE_UNKNOWN
        : (raw as string | null) ?? CAR_RULE_UNKNOWN;

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const options = [...counts.entries()].map(([value, count]) => ({
    value,
    label: value,
    count,
  }));

  if (category === "seats") {
    return options.sort((a, b) => Number(a.value) - Number(b.value));
  }

  return options.sort((a, b) => compareStrings(a.label, b.label));
}

export function buildSearchFacets(
  results: Yolcu360CarResult[],
  filters: CarSearchFilterState
): CarSearchFacets {
  const prices = results
    .map(getCarTotalPrice)
    .filter((price): price is number => price != null);

  const priceRange = {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
  };

  return {
    transmission: buildFacetOptions(
      applyFiltersExcept(results, filters, "transmission"),
      "transmission",
      filters.brand
    ),
    fuel: buildFacetOptions(applyFiltersExcept(results, filters, "fuel"), "fuel", filters.brand),
    carClass: buildFacetOptions(
      applyFiltersExcept(results, filters, "carClass"),
      "carClass",
      filters.brand
    ),
    brand: buildFacetOptions(applyFiltersExcept(results, filters, "brand"), "brand", filters.brand),
    model: buildFacetOptions(
      applyFiltersExcept(results, filters, "model"),
      "model",
      filters.brand
    ),
    vendor: buildFacetOptions(
      applyFiltersExcept(results, filters, "vendor"),
      "vendor",
      filters.brand
    ),
    seats: buildFacetOptions(
      applyFiltersExcept(results, filters, "seats"),
      "seats",
      filters.brand
    ),
    km: buildFacetOptions(applyFiltersExcept(results, filters, "km"), "km", filters.brand),
    deposit: buildFacetOptions(
      applyFiltersExcept(results, filters, "deposit"),
      "deposit",
      filters.brand
    ),
    delivery: buildFacetOptions(
      applyFiltersExcept(results, filters, "delivery"),
      "delivery",
      filters.brand
    ),
    priceRange,
  };
}

export function applyCarSearchFilters(
  results: Yolcu360CarResult[],
  filters: CarSearchFilterState
) {
  return applyFiltersExcept(results, filters, null);
}

export function sortCarResults(
  results: Yolcu360CarResult[],
  sortBy: CarSearchSortBy
): Yolcu360CarResult[] {
  const sorted = [...results];

  sorted.sort((a, b) => {
    if (sortBy === "brand_az") {
      const brandCompare = compareStrings(a.brand?.name ?? "", b.brand?.name ?? "");
      if (brandCompare !== 0) return brandCompare;
      const modelCompare = compareStrings(a.model?.name ?? "", b.model?.name ?? "");
      if (modelCompare !== 0) return modelCompare;
    }

    const priceA = getCarTotalPrice(a);
    const priceB = getCarTotalPrice(b);

    if (priceA == null && priceB == null) return 0;
    if (priceA == null) return 1;
    if (priceB == null) return -1;

    if (sortBy === "highest_price_first") return priceB - priceA;
    return priceA - priceB;
  });

  return sorted;
}

export function parseFilterParams(
  params: Record<string, string>
): CarSearchFilterState {
  const sortRaw = params[FILTER_PARAM_KEYS.sortBy];
  const sortBy: CarSearchSortBy =
    sortRaw === "highest_price_first" || sortRaw === "brand_az"
      ? sortRaw
      : "lowest_price_first";

  const priceMinRaw = params[FILTER_PARAM_KEYS.priceMin];
  const priceMaxRaw = params[FILTER_PARAM_KEYS.priceMax];

  return {
    sortBy,
    transmission: parseCsv(params[FILTER_PARAM_KEYS.transmission]),
    fuel: parseCsv(params[FILTER_PARAM_KEYS.fuel]),
    carClass: parseCsv(params[FILTER_PARAM_KEYS.carClass]),
    brand: parseCsv(params[FILTER_PARAM_KEYS.brand]),
    model: parseCsv(params[FILTER_PARAM_KEYS.model]),
    vendor: parseCsv(params[FILTER_PARAM_KEYS.vendor]),
    seats: parseSeatCsv(params[FILTER_PARAM_KEYS.seats]),
    priceMin: priceMinRaw ? Number(priceMinRaw) : null,
    priceMax: priceMaxRaw ? Number(priceMaxRaw) : null,
    km: parseCsv(params[FILTER_PARAM_KEYS.km]),
    deposit: parseCsv(params[FILTER_PARAM_KEYS.deposit]),
    delivery: parseCsv(params[FILTER_PARAM_KEYS.delivery]),
  };
}

export function serializeFilterParams(
  baseParams: Record<string, string>,
  filters: CarSearchFilterState
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [key, value] of Object.entries(baseParams)) {
    if (CAR_SEARCH_BASE_PARAM_KEYS.has(key)) {
      next[key] = value;
    }
  }

  if (filters.sortBy !== "lowest_price_first") {
    next[FILTER_PARAM_KEYS.sortBy] = filters.sortBy;
  }

  if (filters.transmission.length) {
    next[FILTER_PARAM_KEYS.transmission] = serializeCsv(filters.transmission);
  }
  if (filters.fuel.length) {
    next[FILTER_PARAM_KEYS.fuel] = serializeCsv(filters.fuel);
  }
  if (filters.carClass.length) {
    next[FILTER_PARAM_KEYS.carClass] = serializeCsv(filters.carClass);
  }
  if (filters.brand.length) {
    next[FILTER_PARAM_KEYS.brand] = serializeCsv(filters.brand);
  }
  if (filters.model.length) {
    next[FILTER_PARAM_KEYS.model] = serializeCsv(filters.model);
  }
  if (filters.vendor.length) {
    next[FILTER_PARAM_KEYS.vendor] = serializeCsv(filters.vendor);
  }
  if (filters.seats.length) {
    next[FILTER_PARAM_KEYS.seats] = serializeCsv(filters.seats);
  }
  if (filters.priceMin != null) {
    next[FILTER_PARAM_KEYS.priceMin] = String(filters.priceMin);
  }
  if (filters.priceMax != null) {
    next[FILTER_PARAM_KEYS.priceMax] = String(filters.priceMax);
  }
  if (filters.km.length) {
    next[FILTER_PARAM_KEYS.km] = serializeCsv(filters.km);
  }
  if (filters.deposit.length) {
    next[FILTER_PARAM_KEYS.deposit] = serializeCsv(filters.deposit);
  }
  if (filters.delivery.length) {
    next[FILTER_PARAM_KEYS.delivery] = serializeCsv(filters.delivery);
  }

  return next;
}

export function hasActiveCarFilters(filters: CarSearchFilterState) {
  return (
    filters.sortBy !== "lowest_price_first" ||
    ARRAY_FILTER_CATEGORIES.some((key) => filters[key].length > 0) ||
    filters.priceMin != null ||
    filters.priceMax != null
  );
}

export function clearCarSearchFilters(
  filters: CarSearchFilterState
): CarSearchFilterState {
  return { ...DEFAULT_CAR_SEARCH_FILTERS };
}

export function toggleFilterValue<T extends string | number>(
  selected: T[],
  value: T
): T[] {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}
