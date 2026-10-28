import { Suspense } from "react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import { homeSeo } from "@/lib/i18n/international-seo";
import HomeHero from "@/components/home/HomeHero";
import HomeBelowFold from "@/components/home/HomeBelowFold";
import Theme2Home from "@/components/theme-2/Theme2Home";
import {
  heroTitleMessageKey,
  shouldLocalizeHeroTitle,
} from "@/lib/i18n/localized-hero-title";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const seo = homeSeo(locale);
  return {
    title: seo.title,
    description: seo.description,
    alternates: buildPublicAlternates(locale, "/"),
  };
}

export default async function HomePage() {
  const [company, locale] = await Promise.all([
    getCompanySettings(),
    getLocale(),
  ]);
  const site = await getPublicSiteProfile(company);
  const tHome = await getTranslations("home");
  const heroKey = heroTitleMessageKey(site.key);
  const heroTitle =
    shouldLocalizeHeroTitle(locale, site.key) && heroKey
      ? tHome(heroKey)
      : site.heroTitle;

  if (site.homeTheme === "theme-2") {
    return (
      <Theme2Home
        brandName={site.brandName}
        siteKey={site.key}
      />
    );
  }

  return (
    <>
      <HomeHero title={heroTitle} imageUrl={site.heroImageUrl} />
      <Suspense fallback={null}>
        <HomeBelowFold company={company} siteKey={site.key} />
      </Suspense>
    </>
  );
}
