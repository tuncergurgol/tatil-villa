export const BILETALL_IFRAME_HOST = "https://iframe.biletall.com";
export const BILETALL_DEFAULT_PORTAL_SLUG = "tatildeyizcomtr";

export const BILET_PUBLIC_ROUTES = {
  ara: "/bilet/ara",
  satinal: "/bilet/satinal",
  sonuc: "/bilet/sonuc",
} as const;

export type BiletallIframeKind = "ara" | "satinal" | "sonuc";

const IFRAME_PAGES: Record<
  BiletallIframeKind,
  { file: string; id: string; scrolling: "no" | "auto"; height: number }
> = {
  ara: {
    file: "Arama.aspx",
    id: "AramaIframe_v102",
    scrolling: "no",
    height: 350,
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

export function buildBiletallIframeSrc(
  kind: BiletallIframeKind,
  portalSlug?: string | null
) {
  const slug = normalizeBiletallPortalSlug(portalSlug);
  const page = IFRAME_PAGES[kind];
  const params = new URLSearchParams({
    AramaUrl: "bilet/ara",
    IslemUrl: "bilet/satinal",
    BiletGosterimUrl: "bilet/sonuc",
  });
  return `${BILETALL_IFRAME_HOST}/portals/${slug}/UI/${page.file}?${params.toString()}`;
}

export function getBiletallIframeMeta(kind: BiletallIframeKind) {
  return IFRAME_PAGES[kind];
}

export function getBiletallAdminLinks(portalSlug?: string | null) {
  const slug = normalizeBiletallPortalSlug(portalSlug);
  return [
    {
      kind: "ara" as const,
      label: "Bilet Ara",
      publicPath: BILET_PUBLIC_ROUTES.ara,
      iframeSrc: buildBiletallIframeSrc("ara", slug),
    },
    {
      kind: "satinal" as const,
      label: "Bilet Satın Al",
      publicPath: BILET_PUBLIC_ROUTES.satinal,
      iframeSrc: buildBiletallIframeSrc("satinal", slug),
    },
    {
      kind: "sonuc" as const,
      label: "Bilet Sonuç / PNR",
      publicPath: BILET_PUBLIC_ROUTES.sonuc,
      iframeSrc: buildBiletallIframeSrc("sonuc", slug),
    },
  ];
}
