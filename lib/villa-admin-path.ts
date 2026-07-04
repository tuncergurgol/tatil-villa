export type VillaAdminRoute = {
  id: string;
  villaId?: number | null;
};

export function villaAdminEditPath(villa: VillaAdminRoute): string {
  if (villa.villaId != null) {
    return `/admin/villalar/${villa.villaId}/duzenle`;
  }
  return `/admin/villalar/${villa.id}/duzenle`;
}

export function parseVillaRouteParam(routeParam: string) {
  if (/^\d+$/.test(routeParam)) {
    return { kind: "villaId" as const, value: Number(routeParam) };
  }
  return { kind: "cuid" as const, value: routeParam };
}
