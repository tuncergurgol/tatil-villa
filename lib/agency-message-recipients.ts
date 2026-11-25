export const AGENCY_MESSAGE_RECIPIENT_OPTIONS = [
  { value: "KARŞILAYAN", label: "KARŞILAYAN" },
  { value: "MİSAFİR", label: "MİSAFİR" },
  { value: "TAKVİM YÖNETEN", label: "TAKVİM YÖNETEN" },
  { value: "YÖNETİM", label: "YÖNETİM" },
] as const;

export type AgencyMessageRecipientValue =
  (typeof AGENCY_MESSAGE_RECIPIENT_OPTIONS)[number]["value"];

export function getSortedAgencyMessageRecipientOptions() {
  return [...AGENCY_MESSAGE_RECIPIENT_OPTIONS].sort((a, b) =>
    a.label.localeCompare(b.label, "tr", { sensitivity: "base" })
  );
}

export function isValidAgencyMessageRecipient(
  value: string
): value is AgencyMessageRecipientValue {
  return AGENCY_MESSAGE_RECIPIENT_OPTIONS.some((option) => option.value === value);
}

export function getAgencyMessageRecipientLabel(value: string) {
  return (
    AGENCY_MESSAGE_RECIPIENT_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}
