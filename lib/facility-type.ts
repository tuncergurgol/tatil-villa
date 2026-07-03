import type { VillaCategory } from "@prisma/client";

export const facilityTypeOptions: { value: VillaCategory; label: string }[] = [
  { value: "villa", label: "Villa" },
  { value: "apart", label: "Apart" },
  { value: "suit_daire", label: "Suit Daire" },
];

export function facilityTypeLabel(category: VillaCategory): string {
  return (
    facilityTypeOptions.find((option) => option.value === category)?.label ??
    "Villa"
  );
}
