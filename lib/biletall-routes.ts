import type { BiletallIframeKind } from "@/lib/biletall";

export type BiletallRouteRecord = {
  kind: BiletallIframeKind;
  label: string;
  publicPath: string;
  callbackPath: string;
};

export const DEFAULT_BILETALL_ROUTES: BiletallRouteRecord[] = [
  {
    kind: "ara",
    label: "Bilet Ara",
    publicPath: "/bilet/ara",
    callbackPath: "bilet/ara",
  },
  {
    kind: "satinal",
    label: "Bilet Satın Al",
    publicPath: "/bilet/satinal",
    callbackPath: "bilet/satinal",
  },
  {
    kind: "sonuc",
    label: "Bilet Sonuç / PNR",
    publicPath: "/bilet/sonuc",
    callbackPath: "bilet/sonuc",
  },
];

const KIND_ORDER: BiletallIframeKind[] = ["ara", "satinal", "sonuc"];

function normalizePublicPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeCallbackPath(path: string) {
  return path.trim().replace(/^\/+/, "");
}

export function normalizeBiletallRouteRecord(
  record: Partial<BiletallRouteRecord> & { kind: BiletallIframeKind }
): BiletallRouteRecord {
  const fallback =
    DEFAULT_BILETALL_ROUTES.find((item) => item.kind === record.kind) ??
    DEFAULT_BILETALL_ROUTES[0];

  return {
    kind: record.kind,
    label: (record.label ?? fallback.label).trim() || fallback.label,
    publicPath:
      normalizePublicPath(record.publicPath ?? fallback.publicPath) ||
      fallback.publicPath,
    callbackPath:
      normalizeCallbackPath(record.callbackPath ?? fallback.callbackPath) ||
      fallback.callbackPath,
  };
}

export function parseBiletallRoutesJson(
  json?: string | null
): BiletallRouteRecord[] {
  if (!json?.trim()) return [...DEFAULT_BILETALL_ROUTES];

  try {
    const parsed = JSON.parse(json) as { routes?: BiletallRouteRecord[] };
    if (!Array.isArray(parsed.routes) || parsed.routes.length === 0) {
      return [...DEFAULT_BILETALL_ROUTES];
    }

    const byKind = new Map<BiletallIframeKind, BiletallRouteRecord>();
    for (const item of parsed.routes) {
      if (!item?.kind || !KIND_ORDER.includes(item.kind)) continue;
      byKind.set(item.kind, normalizeBiletallRouteRecord(item));
    }

    return KIND_ORDER.map(
      (kind) => byKind.get(kind) ?? normalizeBiletallRouteRecord({ kind })
    );
  } catch {
    return [...DEFAULT_BILETALL_ROUTES];
  }
}

export function serializeBiletallRoutes(routes: BiletallRouteRecord[]) {
  return JSON.stringify({
    routes: KIND_ORDER.map((kind) => {
      const record = routes.find((item) => item.kind === kind);
      return normalizeBiletallRouteRecord({ kind, ...record });
    }),
  });
}

export function getBiletallCallbacks(routes: BiletallRouteRecord[]) {
  const byKind = Object.fromEntries(routes.map((route) => [route.kind, route]));
  const ara = byKind.ara ?? DEFAULT_BILETALL_ROUTES[0];
  const satinal = byKind.satinal ?? DEFAULT_BILETALL_ROUTES[1];
  const sonuc = byKind.sonuc ?? DEFAULT_BILETALL_ROUTES[2];

  return {
    AramaUrl: ara.callbackPath,
    IslemUrl: satinal.callbackPath,
    BiletGosterUrl: sonuc.callbackPath,
  };
}

export function getBiletPublicPathMap(routes: BiletallRouteRecord[]) {
  const byKind = Object.fromEntries(routes.map((route) => [route.kind, route]));
  return {
    ara: byKind.ara?.publicPath ?? DEFAULT_BILETALL_ROUTES[0].publicPath,
    satinal:
      byKind.satinal?.publicPath ?? DEFAULT_BILETALL_ROUTES[1].publicPath,
    sonuc: byKind.sonuc?.publicPath ?? DEFAULT_BILETALL_ROUTES[2].publicPath,
  };
}

export function isDefaultBiletallRoute(record: BiletallRouteRecord) {
  const fallback = DEFAULT_BILETALL_ROUTES.find((item) => item.kind === record.kind);
  if (!fallback) return true;
  return (
    record.label === fallback.label &&
    record.publicPath === fallback.publicPath &&
    record.callbackPath === fallback.callbackPath
  );
}
