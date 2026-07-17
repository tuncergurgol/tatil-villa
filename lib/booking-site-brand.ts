import { normalizeBookingSiteInfo } from "@/lib/booking-form-details";

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
    names: ["Balayı Villacısı", "Balayi Villacisi"],
    domain: "www.balayivillacisi.com",
    logoUrl: "/brands/balayi-villacisi/logo.png",
  },
  {
    names: ["Tatil Villacısı", "Tatil Villacisi", "TATİL VİLLACISI"],
    domain: "www.tatilvillacisi.com",
    logoUrl: "/brands/tatil-villacisi/logo.png",
  },
];

const DEFAULT_PUBLIC_DOMAIN = "www.tatildeyiz.com.tr";

function namesMatch(a: string, b: string): boolean {
  return a.localeCompare(b, "tr", { sensitivity: "base" }) === 0;
}

function normalizeHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .split("/")[0]!
    .split(":")[0]!;
}

/** Admin / yerel hostlar müşteri linkine yazılmaz. */
export function isNonPublicBookingHost(domain: string | null | undefined): boolean {
  const host = normalizeHost(domain ?? "");
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.startsWith("bont.")) return true;
  return false;
}

/**
 * Müşteriye gidecek public domain.
 * `bont.tatildeyiz.com.tr` gibi admin hostları www.tatildeyiz.com.tr'ye düşer.
 */
export function sanitizePublicBookingDomain(
  domain: string | null | undefined
): string {
  const host = normalizeHost(domain ?? "");
  if (!host || isNonPublicBookingHost(host)) {
    return DEFAULT_PUBLIC_DOMAIN;
  }
  return host;
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
  if (fromMap && !isNonPublicBookingHost(fromMap)) {
    return sanitizePublicBookingDomain(fromMap);
  }

  const known = findKnownBrand(name);
  if (known) return known.domain;

  return sanitizePublicBookingDomain(fallbackDomain);
}

/**
 * Rezervasyonun geldiği site markası (liste, form, bildirim, belge).
 * Öncelik: bilinen marka → originDomain → AgencySite → şirket varsayılanı.
 * Admin host (bont.*) asla public domain olarak dönmez.
 */
export function resolveBookingSiteBrand(input: {
  siteInfo?: string | null;
  originDomain?: string | null;
  company: CompanyBrandFallback;
  agencySites?: AgencySiteNameDomain[];
}): BookingSiteBrand {
  const siteInfo = normalizeBookingSiteInfo(input.siteInfo);
  const companyDomain = sanitizePublicBookingDomain(
    input.company.domain?.trim() ||
      input.company.brandName?.trim() ||
      DEFAULT_PUBLIC_DOMAIN
  );
  const companyLogo = input.company.logoUrl?.trim() || "";
  const known = findKnownBrand(siteInfo);

  const originDomainRaw = input.originDomain?.trim() || "";
  const originDomain = originDomainRaw
    ? sanitizePublicBookingDomain(originDomainRaw)
    : "";

  const agencyMatch = (input.agencySites ?? []).find((site) =>
    namesMatch(site.name.trim(), siteInfo)
  );
  const agencyDomainRaw = agencyMatch?.domain?.trim() || "";
  const agencyDomain =
    agencyDomainRaw && !isNonPublicBookingHost(agencyDomainRaw)
      ? sanitizePublicBookingDomain(agencyDomainRaw)
      : "";

  // Bilinen marka (Tatil/Balayı Villacısı) siteInfo'dan kesin domain alır.
  if (known) {
    return {
      siteInfo,
      domain: known.domain,
      logoUrl: known.logoUrl || companyLogo,
    };
  }

  if (originDomainRaw && !isNonPublicBookingHost(originDomainRaw)) {
    return {
      siteInfo,
      domain: originDomain,
      logoUrl: companyLogo,
    };
  }

  if (agencyDomain) {
    return {
      siteInfo,
      domain: agencyDomain,
      logoUrl: companyLogo,
    };
  }

  return {
    siteInfo,
    domain: companyDomain,
    logoUrl: companyLogo,
  };
}
