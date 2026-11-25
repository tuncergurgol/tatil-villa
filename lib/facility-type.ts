import type { VillaCategory } from "@prisma/client";

export const facilityTypeOptions: { value: VillaCategory; label: string }[] = [
  { value: "villa", label: "Villa" },
  { value: "apart", label: "Apart" },
  { value: "suit_daire", label: "Suit Daire" },
];

export function facilityTypeLabel(
  category: VillaCategory,
  locale: string = "tr"
): string {
  if (locale !== "tr") {
    const labels: Record<string, { apart: string; suite: string; villa: string }> = {
      de: { apart: "Apartment", suite: "Suite", villa: "Ferienvilla" },
      fr: { apart: "appartement", suite: "suite", villa: "villa" },
      es: { apart: "apartamento", suite: "suite", villa: "villa" },
      bg: { apart: "апартамент", suite: "суит", villa: "вила" },
      el: { apart: "διαμέρισμα", suite: "σουίτα", villa: "βίλα" },
      zh: { apart: "公寓", suite: "套房", villa: "别墅" },
      ru: { apart: "апартаменты", suite: "сьют", villa: "вилла" },
    };
    const pack = labels[locale] ?? {
      apart: "Apartment",
      suite: "Suite",
      villa: "Villa",
    };
    if (category === "apart") return pack.apart;
    if (category === "suit_daire") return pack.suite;
    return pack.villa;
  }
  return (
    facilityTypeOptions.find((option) => option.value === category)?.label ??
    "Villa"
  );
}
