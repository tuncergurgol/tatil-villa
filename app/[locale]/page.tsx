import { Suspense } from "react";
import HomeHero from "@/components/home/HomeHero";
import HomeBelowFold from "@/components/home/HomeBelowFold";
import Theme2Home from "@/components/theme-2/Theme2Home";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

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
      <HomeHero title={site.heroTitle} imageUrl={site.heroImageUrl} />
      <Suspense fallback={null}>
        <HomeBelowFold company={company} siteKey={site.key} />
      </Suspense>
    </>
  );
}
