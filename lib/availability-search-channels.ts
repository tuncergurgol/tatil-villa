export const AVAILABILITY_SEARCH_CHANNELS = [
  { value: "teklif_iste", label: "Teklif İste" },
  { value: "telefon", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "web", label: "Web Sitesi" },
  { value: "email", label: "E-posta" },
  { value: "diger", label: "Diğer" },
] as const;

export type AvailabilitySearchChannel =
  (typeof AVAILABILITY_SEARCH_CHANNELS)[number]["value"];
