import "server-only";
import { headers } from "next/headers";

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
  key: "tatildeyiz" | "balayi-villacisi" | "tatil-villacisi";
  domain: string;
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  useDefaultLogo: boolean;
};

type BrandedSiteProfile = Omit<PublicSiteProfile, "useDefaultLogo">;

const BRANDED_SITES: Array<{ hosts: string[]; profile: BrandedSiteProfile }> = [
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
    },
  },
];

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
    useDefaultLogo: true,
  };
}

export async function getPublicSiteProfile(
  company: CompanyBrandSource
): Promise<PublicSiteProfile> {
  return resolvePublicSiteProfile(company, await getRequestHostname());
}
