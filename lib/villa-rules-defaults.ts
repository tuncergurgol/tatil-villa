export const DEFAULT_PREPAYMENT_PAYMENT_TYPE_ID = "prepay_checkin_plus_1_day";

export function resolvePrepaymentPaymentTypeId(
  currentId: string | null | undefined,
  options: { id: string; name: string }[]
): string {
  if (currentId) return currentId;

  const byId = options.find(
    (option) => option.id === DEFAULT_PREPAYMENT_PAYMENT_TYPE_ID
  );
  if (byId) return byId.id;

  const byName = options.find((option) =>
    /giriş\s*\+\s*1/i.test(option.name)
  );
  return byName?.id ?? options[0]?.id ?? "";
}

export function resolveAllowBabyDefault(value: boolean): boolean {
  return value !== false;
}

export function resolveAllowChildrenDefault(value: boolean): boolean {
  return value !== false;
}
