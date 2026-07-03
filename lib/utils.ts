export function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);
}

export function guestSummary(counts: {
  adults: number;
  children: number;
  babies: number;
  pets: number;
}): string {
  const parts: string[] = [];
  if (counts.adults > 0) {
    parts.push(`${counts.adults} Yetişkin`);
  }
  if (counts.children > 0) {
    parts.push(`${counts.children} Çocuk`);
  }
  if (counts.babies > 0) {
    parts.push(`${counts.babies} Bebek`);
  }
  if (counts.pets > 0) {
    parts.push(`${counts.pets} Evcil Hayvan`);
  }
  return parts.length > 0 ? parts.join(", ") : "1 Yetişkin";
}

export function categoryLabel(category: "villa" | "bungalov"): string {
  return category === "bungalov" ? "Bungalov" : "Kiralık Villa";
}
