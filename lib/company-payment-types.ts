export const COMPANY_PAYMENT_TYPE_OPTIONS = [
  { value: "bank_transfer", label: "Banka Havale/Eft" },
  { value: "credit_card", label: "Kredi Kartı/Sanal POS" },
  { value: "western_union", label: "Western Union / Money Gram" },
] as const;

export type CompanyPaymentTypeValue =
  (typeof COMPANY_PAYMENT_TYPE_OPTIONS)[number]["value"];

export function getSortedCompanyPaymentTypeOptions() {
  return [...COMPANY_PAYMENT_TYPE_OPTIONS].sort((a, b) =>
    a.label.localeCompare(b.label, "tr", { sensitivity: "base" })
  );
}

export function isValidCompanyPaymentType(
  value: string
): value is CompanyPaymentTypeValue {
  return COMPANY_PAYMENT_TYPE_OPTIONS.some((option) => option.value === value);
}

export function getCompanyPaymentTypeLabel(value: string) {
  const normalized = normalizeCompanyPaymentType(value);
  return (
    COMPANY_PAYMENT_TYPE_OPTIONS.find((option) => option.value === normalized)
      ?.label ?? value
  );
}

const LEGACY_PAYMENT_TYPE_MAP: Record<string, CompanyPaymentTypeValue> = {
  banka_havale: "bank_transfer",
  kredi_karti: "credit_card",
  "Banka Havale": "bank_transfer",
  "Banka Havalesi": "bank_transfer",
  "Kredi Kartı": "credit_card",
  Kredikartı: "credit_card",
  transfer: "bank_transfer",
  card: "credit_card",
  havale: "bank_transfer",
  eft: "bank_transfer",
};

/** Public talep (card/transfer) → şirket ödeme türü */
export function mapPublicPaymentMethodToCompanyType(
  value: string | null | undefined
): CompanyPaymentTypeValue | "" {
  if (!value?.trim()) return "";
  const normalized = normalizeCompanyPaymentType(value);
  return isValidCompanyPaymentType(normalized) ? normalized : "";
}

export function normalizeCompanyPaymentType(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isValidCompanyPaymentType(trimmed)) return trimmed;

  const legacy = LEGACY_PAYMENT_TYPE_MAP[trimmed];
  if (legacy) return legacy;

  const byLabel = COMPANY_PAYMENT_TYPE_OPTIONS.find(
    (option) => option.label.localeCompare(trimmed, "tr", { sensitivity: "base" }) === 0
  );
  return byLabel?.value ?? trimmed;
}
