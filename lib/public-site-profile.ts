import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getOptionalSite4Config } from "@/lib/public-site-4";
import type { PublicSiteKey } from "@/lib/public-site-keys";

type CompanyBrandSource = {
  brandName: string;
  domain: string;
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  seoTitle: string;
  seoDescription: string;
};

export type PublicSiteProfile = {
  key: PublicSiteKey;
  domain: string;
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroImageUrl: string;
  useDefaultLogo: boolean;
};

const DEFAULT_HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=60";

type BrandedSiteProfile = Omit<PublicSiteProfile, "useDefaultLogo">;

function buildBrandedSites(): Array<{
  hosts: string[];
  profile: BrandedSiteProfile;
}> {
  const sites: Array<{ hosts: string[]; profile: BrandedSiteProfile }> = [
    {
      hosts: ["balayivillacisi.com", "www.balayivillacisi.com"],
      profile: {
        key: "balayi-villacisi",
        domain: "www.balayivillacisi.com",
        brandName: "Balayı Villacısı",
        logoUrl: "/brands/balayi-villacisi/logo.png",
        faviconUrl: "/brands/balayi-villacisi/favicon.png",
        ogImageUrl: "/brands/balayi-villacisi/og-image.png",
        seoTitle: "Balayı Villacısı - Aşkınıza Özel Hayalinizdeki Balayı",
        seoDescription:
          "Balayı çiftlerine özel korunaklı, jakuzili ve özel havuzlu kiralık villaları keşfedin. Aşkınıza özel unutulmaz bir balayı tatili planlayın.",
        heroTitle: "Aşkınıza Özel Hayalinizdeki Balayı Villaları",
        heroImageUrl: "/brands/balayi-villacisi/hero.png",
      },
    },
    {
      hosts: ["tatilvillacisi.com", "www.tatilvillacisi.com"],
      profile: {
        key: "tatil-villacisi",
        domain: "www.tatilvillacisi.com",
        brandName: "Tatil Villacısı",
        logoUrl: "/brands/tatil-villacisi/logo.png",
        faviconUrl: "/brands/tatil-villacisi/favicon.png",
        ogImageUrl: "/brands/tatil-villacisi/og-image.png",
        seoTitle: "Tatil Villacısı - Hayalinizdeki Tatil Villası",
        seoDescription:
          "Türkiye'nin en güzel bölgelerinde özel havuzlu, deniz manzaralı ve korunaklı kiralık tatil villalarını keşfedin. Hayalinizdeki tatili Tatil Villacısı ile planlayın.",
        heroTitle: "Hayalinizdeki Tatil Villası Bir Tık Uzağınızda",
        heroImageUrl: "/brands/tatil-villacisi/hero.png",
      },
    },
  ];

  const site4 = getOptionalSite4Config();
  if (site4) {
    sites.push({
      hosts: site4.hosts,
      profile: {
        key: site4.key,
        domain: site4.domain,
        brandName: site4.brandName,
        logoUrl: `/brands/${site4.key}/logo.png`,
        faviconUrl: `/brands/${site4.key}/favicon.png`,
        ogImageUrl: `/brands/${site4.key}/og-image.png`,
        seoTitle: site4.seoTitle,
        seoDescription: site4.seoDescription,
        heroTitle: site4.heroTitle,
        heroImageUrl: `/brands/${site4.key}/hero.png`,
      },
    });
  }

  return sites;
}

const BRANDED_SITES = buildBrandedSites();

const BRANDED_SITE_BY_HOST = new Map<string, BrandedSiteProfile>(
  BRANDED_SITES.flatMap(({ hosts, profile }) =>
    hosts.map((host) => [host, profile] as const)
  )
);

export function normalizeRequestHostname(value: string | null): string {
  const firstValue = (value ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return firstValue.replace(/^https?:\/\//, "").split("/")[0]!.split(":")[0]!;
}

export async function getRequestHostname(): Promise<string> {
  const requestHeaders = await headers();
  return normalizeRequestHostname(
    requestHeaders.get("host") ?? requestHeaders.get("x-forwarded-host")
  );
}

export function resolvePublicSiteProfile(
  company: CompanyBrandSource,
  hostname: string
): PublicSiteProfile {
  const branded = BRANDED_SITE_BY_HOST.get(normalizeRequestHostname(hostname));
  if (branded) {
    return { ...branded, useDefaultLogo: false };
  }

  return {
    key: "tatildeyiz",
    domain: company.domain,
    brandName: company.brandName,
    logoUrl: company.logoUrl,
    faviconUrl: company.faviconUrl,
    ogImageUrl: company.ogImageUrl,
    seoTitle: company.seoTitle,
    seoDescription: company.seoDescription,
    heroTitle: "Yeni Maceranı Keşfet",
    heroImageUrl: DEFAULT_HERO_IMAGE_URL,
    useDefaultLogo: true,
  };
}

export const getPublicSiteProfile = cache(async function getPublicSiteProfile(
  company: CompanyBrandSource
): Promise<PublicSiteProfile> {
  return resolvePublicSiteProfile(company, await getRequestHostname());
});

export function resolvePublicSiteKey(hostname: string): PublicSiteProfile["key"] {
  return (
    BRANDED_SITE_BY_HOST.get(normalizeRequestHostname(hostname))?.key ??
    "tatildeyiz"
  );
}

export async function getRequestPublicSiteKey(): Promise<PublicSiteProfile["key"]> {
  return resolvePublicSiteKey(await getRequestHostname());
}

export function getPublicSiteProfileByKey(
  company: CompanyBrandSource,
  siteKey: PublicSiteProfile["key"]
): PublicSiteProfile {
  const branded = BRANDED_SITES.find((entry) => entry.profile.key === siteKey);
  if (branded) {
    return { ...branded.profile, useDefaultLogo: false };
  }

  return {
    key: "tatildeyiz",
    domain: company.domain,
    brandName: company.brandName,
    logoUrl: company.logoUrl,
    faviconUrl: company.faviconUrl,
    ogImageUrl: company.ogImageUrl,
    seoTitle: company.seoTitle,
    seoDescription: company.seoDescription,
    heroTitle: "Yeni Maceranı Keşfet",
    heroImageUrl: DEFAULT_HERO_IMAGE_URL,
    useDefaultLogo: true,
  };
}
