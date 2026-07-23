import {
  DEFAULT_BILETALL_ROUTES,
  getBiletallCallbacks,
  type BiletallRouteRecord,
} from "@/lib/biletall-routes";
import {
  appendBiletallCredentialsToSrc,
  sanitizeBiletallIframeSrc,
} from "@/lib/biletall-iframe-src";
import {
  resolveBiletallPublicOrigin,
  syncBiletallCallbackParamsInSrc,
} from "@/lib/biletall-callbacks";

export const BILETALL_IFRAME_HOST = "https://iframe.biletall.com";
export const BILETALL_DEFAULT_PORTAL_SLUG = "tatildeyizcomtr";
export const BILETALL_IFRAME_VERSION = "UI";

export const BILET_PUBLIC_ROUTES = {
  ara: "/bilet/ara",
  satinal: "/bilet/satinal",
  sonuc: "/bilet/sonuc",
} as const;

export type BiletallIframeKind = "ara" | "satinal" | "sonuc";

export type BiletallCredentials = {
  username?: string | null;
  password?: string | null;
};

const IFRAME_PAGES: Record<
  BiletallIframeKind,
  { file: string; id: string; scrolling: "no" | "auto"; height: number }
> = {
  ara: {
    file: "Arama.aspx",
    id: "AramaIframe_v102",
    scrolling: "no",
    height: 400,
  },
  satinal: {
    file: "Islem.aspx",
    id: "IslemIframe_v102",
    scrolling: "auto",
    height: 1600,
  },
  sonuc: {
    file: "BiletGosterim.aspx",
    id: "BiletGosterim_v102",
    scrolling: "auto",
    height: 670,
  },
};

export function normalizeBiletallPortalSlug(slug?: string | null) {
  const trimmed = (slug ?? "").trim().toLowerCase();
  return trimmed || BILETALL_DEFAULT_PORTAL_SLUG;
}

export function resolveBiletallIframeSrc(
  kind: BiletallIframeKind,
  portalSlug?: string | null,
  credentials?: BiletallCredentials,
  routes: BiletallRouteRecord[] = DEFAULT_BILETALL_ROUTES,
  publicOrigin = resolveBiletallPublicOrigin()
) {
  const route = routes.find((item) => item.kind === kind);
  const custom = sanitizeBiletallIframeSrc(route?.customIframeSrc);
  if (custom) {
    const callbacks = getBiletallCallbacks(routes, publicOrigin);
    const synced = syncBiletallCallbackParamsInSrc(custom, callbacks, publicOrigin);
    return appendBiletallCredentialsToSrc(synced, credentials);
  }
  return buildBiletallIframeSrc(
    kind,
    portalSlug,
    credentials,
    routes,
    publicOrigin
  );
}

export function buildBiletallIframeSrc(
  kind: BiletallIframeKind,
  portalSlug?: string | null,
  credentials?: BiletallCredentials,
  routes: BiletallRouteRecord[] = DEFAULT_BILETALL_ROUTES,
  publicOrigin = resolveBiletallPublicOrigin()
) {
  const slug = normalizeBiletallPortalSlug(portalSlug);
  const page = IFRAME_PAGES[kind];
  const callbacks = getBiletallCallbacks(routes, publicOrigin);
  const params = new URLSearchParams(callbacks);

  const username = credentials?.username?.trim();
  const password = credentials?.password?.trim();
  if (username) params.set("KullaniciAdi", username);
  if (password) params.set("Sifre", password);

  return `${BILETALL_IFRAME_HOST}/portals/${slug}/${BILETALL_IFRAME_VERSION}/${page.file}?${params.toString()}`;
}

export function getBiletallIframeMeta(kind: BiletallIframeKind) {
  return IFRAME_PAGES[kind];
}

export function getBiletallAdminLinks(
  portalSlug?: string | null,
  credentials?: BiletallCredentials,
  routes: BiletallRouteRecord[] = DEFAULT_BILETALL_ROUTES,
  publicOrigin = resolveBiletallPublicOrigin()
) {
  const slug = normalizeBiletallPortalSlug(portalSlug);
  return routes.map((route) => ({
    kind: route.kind,
    label: route.label,
    publicPath: route.publicPath,
    callbackPath: route.callbackPath,
    customIframeSrc: route.customIframeSrc,
    iframeSrc: resolveBiletallIframeSrc(
      route.kind,
      slug,
      credentials,
      routes,
      publicOrigin
    ),
  }));
}
