import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import EarlyBookingCampaignPageView from "@/components/campaigns/EarlyBookingCampaignPageView";
import ListingSeoSection from "@/components/seo/ListingSeoSection";
import { getVillaSearchResults } from "@/lib/queries/villas";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { parseVillaSearchPage } from "@/lib/villa-search-params";
import { EARLY_BOOKING_PRICE_YEAR } from "@/lib/home-campaigns";
import {
  getCuratedTemaGuide,
  topicGuideToListingSeo,
} from "@/lib/seo-topic-guides";
import { buildCategoryPath } from "@/lib/seo-matrix";
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
} from "@/lib/seo-json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const guide =
    locale === "tr"
      ? getCuratedTemaGuide("erken-rezervasyon", site.key, site.brandName)
      : null;
  return {
    title: guide?.title || "2027 Yılı Erken Rezervasyon Fırsatları",
    description:
      guide?.description ||
      "2027 sezonu fiyatı açıklanan kiralık villalar. Erken rezervasyon ile istediğiniz tarihi şimdiden ayırtın.",
    alternates: buildPublicAlternates(
      locale,
      "/kampanyalar/2027-erken-rezervasyon"
    ),
  };
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function EarlyBookingCampaignPage({
  searchParams,
}: PageProps) {
  const query = await searchParams;
  const page = parseVillaSearchPage(query.page);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const { villas, totalCount, totalPages } = await getVillaSearchResults({
    priceYear: EARLY_BOOKING_PRICE_YEAR,
    sort: "recommended",
    page,
    pageSize: 12,
    siteKey: site.key,
  });

  const guide = getCuratedTemaGuide(
    "erken-rezervasyon",
    site.key,
    site.brandName
  );
  const seo = guide
    ? topicGuideToListingSeo(guide, [
        { href: "/tema/erken-rezervasyon", label: "Erken rezervasyon teması" },
        { href: "/tema/kis-tatili", label: "Kış tatili" },
        {
          href: buildCategoryPath("isitmali-havuzlu-villalar"),
          label: "Isıtmalı havuz",
        },
        {
          href: buildCategoryPath("balayi-villalari"),
          label: "Balayı villaları",
        },
        { href: "/villalar", label: "Tüm villalar" },
      ])
    : null;

  const origin = `https://${site.domain}`;
  const path = `/kampanyalar/${EARLY_BOOKING_PRICE_YEAR}-erken-rezervasyon`;
  const breadcrumbLd = buildBreadcrumbListJsonLd(origin, [
    { name: "Ana Sayfa", path: "/" },
    { name: "Kampanyalar", path: "/kampanyalar/2027-erken-rezervasyon" },
    { name: guide?.h1 || "Erken rezervasyon", path },
  ]);
  const faqLd = seo ? buildFaqPageJsonLd(seo.faqs) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}
      <EarlyBookingCampaignPageView
        villas={villas}
        totalCount={totalCount}
        page={page}
        totalPages={totalPages}
        seoH1={guide?.h1}
      />
      {seo && page === 1 ? (
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <ListingSeoSection content={seo} />
        </div>
      ) : null}
    </>
  );
}
