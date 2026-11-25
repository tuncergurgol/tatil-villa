export function isFeaturedAmenityCategory(category: string) {
  return (
    category.localeCompare("Öne Çıkanlar", "tr", { sensitivity: "base" }) === 0
  );
}

export function compareAmenityNamesTr(a: string, b: string) {
  return a.localeCompare(b, "tr", { sensitivity: "base" });
}

export function sortAmenityNamesTr(names: readonly string[]) {
  return [...names].sort(compareAmenityNamesTr);
}
