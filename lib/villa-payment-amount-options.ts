export type BookingPaymentAmountOption = "prepayment" | "full";

export function resolveVillaPaymentAmountOptions(villa: {
  allowPrepaymentOption?: boolean | null;
  allowFullPaymentOption?: boolean | null;
}): BookingPaymentAmountOption[] {
  const allowPrepayment = villa.allowPrepaymentOption !== false;
  const allowFullPayment = villa.allowFullPaymentOption !== false;
  const options: BookingPaymentAmountOption[] = [];
  if (allowPrepayment) options.push("prepayment");
  if (allowFullPayment) options.push("full");
  return options.length > 0 ? options : ["prepayment", "full"];
}

export function defaultVillaPaymentAmount(
  options: BookingPaymentAmountOption[]
): BookingPaymentAmountOption {
  return options.includes("prepayment") ? "prepayment" : "full";
}
