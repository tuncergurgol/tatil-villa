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
    if (category === "apart") return "Apartment";
    if (category === "suit_daire") return "Suite";
    return "Villa";
  }
  return (
    facilityTypeOptions.find((option) => option.value === category)?.label ??
    "Villa"
  );
}
