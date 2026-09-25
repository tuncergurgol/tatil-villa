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

export function villaAdminHizliFiyatPath(villa: VillaAdminRoute): string {
  if (villa.villaId != null) {
    return `/admin/hizlifiyat/${villa.villaId}`;
  }
  return `/admin/hizlifiyat/${villa.id}`;
}

function villaRouteKey(villa: VillaAdminRoute) {
  return villa.villaId != null ? String(villa.villaId) : villa.id;
}

export function villaOwnerEditPath(villa: VillaAdminRoute): string {
  return `/admin/sahip/villalar/${villaRouteKey(villa)}`;
}

export function villaOwnerHizliFiyatPath(villa: VillaAdminRoute): string {
  return `/admin/sahip/villalar/${villaRouteKey(villa)}/hizlifiyat`;
}

export function parseVillaRouteParam(routeParam: string) {
  if (/^\d+$/.test(routeParam)) {
    return { kind: "villaId" as const, value: Number(routeParam) };
  }
  return { kind: "cuid" as const, value: routeParam };
}
