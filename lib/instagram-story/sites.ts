import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  PUBLIC_SITE_KEYS,
  getPublicSiteMeta,
  type BuiltInPublicSiteKey,
} from "@/lib/public-site-keys";
import type { InstagramStorySiteOption } from "@/lib/instagram-story/types";

export type { InstagramStorySiteOption };

const SITE_ACCENTS: Record<BuiltInPublicSiteKey, string> = {
  tatildeyiz: "#0d9488",
  "balayi-villacisi": "#be185d",
  "tatil-villacisi": "#0f766e",
};

const SITE_LOGOS: Record<BuiltInPublicSiteKey, string | null> = {
  tatildeyiz: null, // şirket logosundan
  "balayi-villacisi": "/brands/balayi-villacisi/logo.png",
  "tatil-villacisi": "/brands/tatil-villacisi/logo.png",
};

export async function listInstagramStorySites(): Promise<
  InstagramStorySiteOption[]
> {
  const company = await getCompanySettings();
  const companyDomain = (company.domain ?? "www.tatildeyiz.com.tr")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  return PUBLIC_SITE_KEYS.map((key) => {
    const meta = getPublicSiteMeta(key);
    const isMain = key === "tatildeyiz";
    const domain = isMain ? companyDomain || meta.domain : meta.domain;
    const ctaLabel = domain.replace(/^www\./i, "");
    return {
      key,
      label: isMain
        ? company.brandName?.trim() || meta.label
        : meta.label,
      domain,
      logoUrl: SITE_LOGOS[key] || company.logoUrl || "",
      accentColor: isMain
        ? company.primaryColor || SITE_ACCENTS[key]
        : SITE_ACCENTS[key],
      ctaLabel,
    };
  });
}

export async function resolveInstagramStorySite(
  siteKey: string | undefined
): Promise<InstagramStorySiteOption> {
  const sites = await listInstagramStorySites();
  const key = (siteKey ?? "tatildeyiz").trim();
  return sites.find((site) => site.key === key) ?? sites[0]!;
}
