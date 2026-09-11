export const OTELZ_BASE_URL = "https://www.otelz.com";

export const OTELZ_DEFAULT_AFFILIATE = {
  to: "1857",
  cid: "274",
} as const;

export const OTELZ_BANNER_IMAGE_URL =
  "https://image.otelz.com/Uploads/AcentaBanner/300x250.gif";

export const OTELZ_BANNER_ALT =
  "Otelz.com, otel rezervasyonunda Türkiye'nin tercihi";

export const OTELZ_PUBLIC_ROUTE = "/otel";

export type OtelzSalesPageId = "home" | "early" | "hourly" | "zpara";

export type OtelzSalesPage = {
  id: OtelzSalesPageId;
  label: string;
  description: string;
  path: string;
};

export const OTELZ_SALES_PAGES: OtelzSalesPage[] = [
  {
    id: "home",
    label: "Otel Ara",
    description: "Türkiye genelinde otel arayın ve karşılaştırın",
    path: "/",
  },
  {
    id: "early",
    label: "Erken Rezervasyon",
    description: "Erken rezervasyon fırsatları",
    path: "/erken-rezervasyon-otelleri",
  },
  {
    id: "hourly",
    label: "Saatlik Oda",
    description: "Kısa süreli konaklama seçenekleri",
    path: "/saatlik-oda",
  },
  {
    id: "zpara",
    label: "Zpara Oteller",
    description: "Zpara kazandıran otel kampanyaları",
    path: "/zpara-kazandiran-oteller",
  },
];

export type OtelzAffiliateParams = {
  to: string;
  cid: string;
};

export function buildOtelzAffiliateUrl(
  path = "/",
  affiliate: OtelzAffiliateParams = OTELZ_DEFAULT_AFFILIATE
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, OTELZ_BASE_URL);
  url.searchParams.set("to", affiliate.to.trim());
  url.searchParams.set("cid", affiliate.cid.trim());
  return url.toString();
}

export function buildOtelzSearchUrl(input: {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  affiliate?: OtelzAffiliateParams;
}): string {
  const url = new URL("/", OTELZ_BASE_URL);
  const affiliate = input.affiliate ?? OTELZ_DEFAULT_AFFILIATE;
  url.searchParams.set("to", affiliate.to.trim());
  url.searchParams.set("cid", affiliate.cid.trim());

  const destination = input.destination?.trim();
  if (destination) {
    url.searchParams.set("q", destination);
    url.searchParams.set("destination", destination);
  }
  if (input.checkIn?.trim()) {
    url.searchParams.set("checkin", input.checkIn.trim());
    url.searchParams.set("checkIn", input.checkIn.trim());
  }
  if (input.checkOut?.trim()) {
    url.searchParams.set("checkout", input.checkOut.trim());
    url.searchParams.set("checkOut", input.checkOut.trim());
  }
  if (input.guests != null && input.guests > 0) {
    url.searchParams.set("guests", String(input.guests));
  }

  return url.toString();
}

export function resolveOtelzSalesPage(id?: string | null): OtelzSalesPage {
  return (
    OTELZ_SALES_PAGES.find((page) => page.id === id) ?? OTELZ_SALES_PAGES[0]!
  );
}
