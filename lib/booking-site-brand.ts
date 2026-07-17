import {
  DEFAULT_BOOKING_SITE_INFO,
  normalizeBookingSiteInfo,
} from "@/lib/booking-form-details";

export type BookingSiteBrand = {
  siteInfo: string;
  domain: string;
  logoUrl: string;
};

type CompanyBrandFallback = {
  brandName: string;
  domain: string;
  logoUrl: string;
};

type AgencySiteNameDomain = {
  name: string;
  domain: string;
};

/** Public marka profilleri — AgencySite.name / brandName ile eşleşir */
const KNOWN_SITE_BRANDS: Array<{
  names: string[];
  domain: string;
  logoUrl: string;
}> = [
  {
    names: ["Balayı Villacısı"],
    domain: "www.balayivillacisi.com",
    logoUrl: "/brands/balayi-villacisi/logo.png",
  },
  {
    names: ["Tatil Villacısı"],
    domain: "www.tatilvillacisi.com",
    logoUrl: "/brands/tatil-villacisi/logo.png",
  },
];

function namesMatch(a: string, b: string): boolean {
  return a.localeCompare(b, "tr", { sensitivity: "base" }) === 0;
}

function findKnownBrand(siteInfo: string) {
  return KNOWN_SITE_BRANDS.find((brand) =>
    brand.names.some((name) => namesMatch(name, siteInfo))
  );
}

export function buildAgencySiteDomainMap(
  sites: AgencySiteNameDomain[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const site of sites) {
    const name = site.name.trim();
    const domain = site.domain.trim();
    if (!name || !domain) continue;
    map.set(name.toLocaleLowerCase("tr"), domain);
  }
  return map;
}

export function resolveDomainFromSiteMap(
  siteInfo: string | null | undefined,
  domainBySiteName: Map<string, string>,
  fallbackDomain: string
): string {
  const name = normalizeBookingSiteInfo(siteInfo);
  const fromMap = domainBySiteName.get(name.toLocaleLowerCase("tr"))?.trim();
  if (fromMap) return fromMap;

  const known = findKnownBrand(name);
  if (known) return known.domain;

  return fallbackDomain.trim() || "www.tatildeyiz.com.tr";
}

/**
 * Rezervasyonun geldiği site markası (liste, form, bildirim, belge).
 * Öncelik: originDomain → AgencySite → bilinen marka → şirket varsayılanı.
 */
export function resolveBookingSiteBrand(input: {
  siteInfo?: string | null;
  originDomain?: string | null;
  company: CompanyBrandFallback;
  agencySites?: AgencySiteNameDomain[];
}): BookingSiteBrand {
  const siteInfo = normalizeBookingSiteInfo(input.siteInfo);
  const companyDomain =
    input.company.domain?.trim() ||
    input.company.brandName?.trim() ||
    "www.tatildeyiz.com.tr";
  const companyLogo = input.company.logoUrl?.trim() || "";

  const originDomain = input.originDomain?.trim() || "";
  if (originDomain) {
    const knownByDomain = KNOWN_SITE_BRANDS.find((brand) =>
      namesMatch(brand.domain, originDomain)
    );
    return {
      siteInfo,
      domain: originDomain,
      logoUrl: knownByDomain?.logoUrl || companyLogo,
    };
  }

  const agencyMatch = (input.agencySites ?? []).find((site) =>
    namesMatch(site.name.trim(), siteInfo)
  );
  const known = findKnownBrand(siteInfo);
  const isDefaultSite = namesMatch(siteInfo, DEFAULT_BOOKING_SITE_INFO);

  return {
    siteInfo,
    domain:
      agencyMatch?.domain?.trim() ||
      known?.domain ||
      (isDefaultSite ? companyDomain : companyDomain),
    logoUrl: known?.logoUrl || (isDefaultSite ? companyLogo : companyLogo),
  };
}
