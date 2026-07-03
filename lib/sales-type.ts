import type { SalesType } from "@prisma/client";

export const salesTypeOptions: { value: SalesType; label: string }[] = [
  { value: "komisyon", label: "Komisyon" },
  { value: "garanti", label: "Garanti" },
];

export function salesTypeLabel(value: SalesType): string {
  return (
    salesTypeOptions.find((option) => option.value === value)?.label ?? value
  );
}
