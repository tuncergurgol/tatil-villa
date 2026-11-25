import { prisma } from "@/lib/db";

export type PaymentProviderFieldType = "text" | "password";

export type PaymentProviderFieldDef = {
  key: string;
  label: string;
  type: PaymentProviderFieldType;
  required: boolean;
};

export type PaymentProviderMaskedField = PaymentProviderFieldDef & {
  maskedValue: string;
  hasValue: boolean;
};

export type PaymentProviderItem = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  isDefault: boolean;
  mode: string;
  sortOrder: number;
  fields: PaymentProviderMaskedField[];
};

export function parseFieldDefs(raw: unknown): PaymentProviderFieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const key = typeof record.key === "string" ? record.key.trim() : "";
      const label = typeof record.label === "string" ? record.label.trim() : "";
      if (!key || !label) return null;
      const type = record.type === "password" ? "password" : "text";
      const required = Boolean(record.required);
      return { key, label, type, required } satisfies PaymentProviderFieldDef;
    })
    .filter((item): item is PaymentProviderFieldDef => item !== null);
}

export function maskCredentialValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "*".repeat(trimmed.length);
  return `****${trimmed.slice(-4)}`;
}

function buildMaskedFields(
  fieldDefs: PaymentProviderFieldDef[],
  credentials: Record<string, unknown>
): PaymentProviderMaskedField[] {
  return fieldDefs.map((field) => {
    const rawValue = credentials[field.key];
    const value = typeof rawValue === "string" ? rawValue : "";
    return {
      ...field,
      maskedValue: maskCredentialValue(value),
      hasValue: value.trim().length > 0,
    };
  });
}

export async function getPaymentProviderAdminData() {
  const items = await prisma.paymentProvider.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const mapped: PaymentProviderItem[] = items.map((item) => {
    const fieldDefs = parseFieldDefs(item.fields);
    const credentials =
      item.credentials && typeof item.credentials === "object"
        ? (item.credentials as Record<string, unknown>)
        : {};
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      active: item.active,
      isDefault: item.isDefault,
      mode: item.mode,
      sortOrder: item.sortOrder,
      fields: buildMaskedFields(fieldDefs, credentials),
    };
  });

  return {
    items: mapped,
    totalCount: mapped.length,
    activeCount: mapped.filter((item) => item.active).length,
  };
}
