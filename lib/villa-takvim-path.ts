import { parseVillaRouteParam, type VillaAdminRoute } from "@/lib/villa-admin-path";

export type VillaTakvimRoute = VillaAdminRoute;

export function villaTakvimRouteParam(villa: VillaTakvimRoute): string {
  if (villa.villaId != null) return String(villa.villaId);
  return villa.id;
}

export function villaTakvimPath(villa?: VillaTakvimRoute | string): string {
  if (!villa) return "/admin/konaklama/takvim";
  const param =
    typeof villa === "string" ? villa : villaTakvimRouteParam(villa);
  return `/admin/konaklama/takvim?villa=${param}`;
}

export function parseVillaTakvimRouteParam(param: string) {
  return parseVillaRouteParam(param);
}

export function isSameVillaTakvimParam(
  villa: VillaTakvimRoute,
  routeParam?: string
): boolean {
  if (!routeParam) return false;
  if (villa.villaId != null && routeParam === String(villa.villaId)) {
    return true;
  }
  return routeParam === villa.id;
}
