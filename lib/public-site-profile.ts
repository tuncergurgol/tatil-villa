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
  key: "tatildeyiz" | "balayi-villacisi";
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

const BALAYI_HOSTS = new Set([
  "balayivillacisi.com",
  "www.balayivillacisi.com",
]);

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
  if (BALAYI_HOSTS.has(normalizeRequestHostname(hostname))) {
    return {
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
      useDefaultLogo: false,
    };
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
