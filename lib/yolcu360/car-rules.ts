import type { Yolcu360CarResult } from "@/lib/yolcu360/types";
import { formatYolcu360Money } from "@/lib/yolcu360/format-money";

export const CAR_RULE_UNKNOWN = "Belirtilmemiş";

export type ParsedCarRules = {
  depositAmount: number | null;
  depositLabel: string;
  dailyKm: number | null;
  totalKm: number | null;
  kmLabel: string;
  deliveryType: string;
  deliveryLabel: string;
  minDriverAge: number | null;
  pickupOfficeName: string | null;
  dropoffOfficeName: string | null;
};

const DEPOSIT_TYPES = new Set([
  "deposit",
  "provision",
  "depositamount",
  "damageDeposit",
  "damagedeposit",
  "provizyon",
  "securitydeposit",
]);

const DAILY_KM_TYPES = new Set([
  "dailykm",
  "dailykilometer",
  "dailymileage",
  "kmlimitdaily",
  "dailykmlimit",
  "dailykmLimit",
]);

const TOTAL_KM_TYPES = new Set([
  "totalkm",
  "totalkilometer",
  "totalmileage",
  "kmlimittotal",
  "totalkmlimit",
]);

const DELIVERY_TYPES = new Set([
  "deliverytype",
  "delivery",
  "pickuptype",
  "pickuptype",
  "deliverymethod",
]);

const MIN_AGE_TYPES = new Set([
  "mindriverage",
  "minimumdriverage",
  "driveragemin",
  "minage",
]);

function normalizeRuleType(type?: string) {
  return type?.toLowerCase().replace(/[_\s-]/g, "") ?? "";
}

function parseNumericRuleValue(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const unlimited = /sınırsız|sinirsiz|unlimited|limitsiz/i.test(trimmed);
  if (unlimited) return 0;

  const digits = trimmed.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTextRuleValue(value: string | number | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function formatKmLabel(dailyKm: number | null, totalKm: number | null): string {
  if (dailyKm === 0) return "Sınırsız";
  if (dailyKm != null && dailyKm > 0) return `${Math.round(dailyKm)} km/gün`;
  if (totalKm === 0) return "Sınırsız";
  if (totalKm != null && totalKm > 0) return `${Math.round(totalKm)} km toplam`;
  return CAR_RULE_UNKNOWN;
}

function formatDepositLabel(amount: number | null): string {
  if (amount == null) return CAR_RULE_UNKNOWN;
  if (amount === 0) return "Depozitosuz";
  return formatYolcu360Money(amount, "TRY");
}

function normalizeDeliveryLabel(raw: string | null, officeName: string | null): string {
  if (officeName?.trim()) return officeName.trim();
  if (!raw) return CAR_RULE_UNKNOWN;

  const lower = raw.toLowerCase();
  if (lower.includes("office") || lower.includes("ofis")) return "Ofis teslim";
  if (lower.includes("address") || lower.includes("adres")) return "Adrese teslim";
  if (lower.includes("airport") || lower.includes("havaliman")) return "Havalimanı teslim";
  return raw.trim();
}

export function parseCarRules(car: Yolcu360CarResult): ParsedCarRules {
  let depositAmount: number | null = null;
  let dailyKm: number | null = null;
  let totalKm: number | null = null;
  let deliveryType: string | null = null;
  let minDriverAge: number | null = null;

  for (const rule of car.rules ?? []) {
    const type = normalizeRuleType(rule.type);
    if (!type) continue;

    if (DEPOSIT_TYPES.has(type)) {
      depositAmount = parseNumericRuleValue(rule.value) ?? depositAmount;
      continue;
    }

    if (DAILY_KM_TYPES.has(type)) {
      dailyKm = parseNumericRuleValue(rule.value) ?? dailyKm;
      continue;
    }

    if (TOTAL_KM_TYPES.has(type)) {
      totalKm = parseNumericRuleValue(rule.value) ?? totalKm;
      continue;
    }

    if (DELIVERY_TYPES.has(type)) {
      deliveryType = parseTextRuleValue(rule.value) ?? deliveryType;
      continue;
    }

    if (MIN_AGE_TYPES.has(type)) {
      minDriverAge = parseNumericRuleValue(rule.value) ?? minDriverAge;
    }
  }

  const pickupOfficeName = car.appointment?.checkInOffice?.name?.trim() || null;
  const dropoffOfficeName = car.appointment?.checkOutOffice?.name?.trim() || null;
  const deliveryLabel = normalizeDeliveryLabel(deliveryType, pickupOfficeName);

  return {
    depositAmount,
    depositLabel: formatDepositLabel(depositAmount),
    dailyKm,
    totalKm,
    kmLabel: formatKmLabel(dailyKm, totalKm),
    deliveryType: deliveryType ?? deliveryLabel,
    deliveryLabel,
    minDriverAge,
    pickupOfficeName,
    dropoffOfficeName,
  };
}

export function getCarDepositFacetKey(car: Yolcu360CarResult): string {
  return parseCarRules(car).depositLabel;
}

export function getCarKmFacetKey(car: Yolcu360CarResult): string {
  return parseCarRules(car).kmLabel;
}

export function getCarDeliveryFacetKey(car: Yolcu360CarResult): string {
  return parseCarRules(car).deliveryLabel;
}
