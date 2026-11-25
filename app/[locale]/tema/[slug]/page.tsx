import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import ListingBreadcrumbs from "@/components/seo/ListingBreadcrumbs";
import ListingSeoSection from "@/components/seo/ListingSeoSection";
import VillaResultCard from "@/components/search/VillaResultCard";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import { getPublicListingCopy } from "@/lib/public-listing-copy";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getVillaSearchResults } from "@/lib/queries/villas";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { publicIndexingRobots } from "@/lib/public-indexing";
import {
  buildBreadcrumbListJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
} from "@/lib/seo-json-ld";
import {
  SEO_TEMA_SLUGS,
  getCuratedTemaGuide,
  topicGuideToListingSeo,
} from "@/lib/seo-topic-guides";
import { buildCategoryPath, buildGuidePath } from "@/lib/seo-matrix";
import { EARLY_BOOKING_PRICE_YEAR } from "@/lib/home-campaigns";
import { Link } from "@/lib/i18n/navigation";
import { villaPublicPath } from "@/lib/villa-public-path";
import { getFacilityCategoryBySlug } from "@/lib/queries/seo-category";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function temaPath(slug: string) {
  return `/tema/${slug}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const guide =
    locale === "tr"
      ? getCuratedTemaGuide(slug, site.key, site.brandName)
      : null;
  if (!guide) {
    return { title: "Tema", robots: publicIndexingRobots(false) };
  }
  return {
    title: guide.title,
    description: guide.description,
    alternates: buildPublicAlternates(locale, temaPath(slug)),
    robots: publicIndexingRobots(true),
  };
}

export default async function TemaPage({ params }: PageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  if (!SEO_TEMA_SLUGS.includes(slug)) notFound();

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const guide = getCuratedTemaGuide(slug, site.key, site.brandName);
  if (!guide) notFound();

  const copy = getPublicListingCopy(site.key, locale);
  const isEarly = slug === "erken-rezervasyon";
  const heated = await getFacilityCategoryBySlug("isitmali-havuzlu-villalar");

  const search = await getVillaSearchResults({
    ...(isEarly
      ? { priceYear: EARLY_BOOKING_PRICE_YEAR }
      : heated
        ? { facilities: [heated.name] }
        : {}),
    sort: "recommended",
    page: 1,
    pageSize: 12,
    siteKey: site.key,
  });

  const relatedLinks = isEarly
    ? [
        {
          href: `/kampanyalar/${EARLY_BOOKING_PRICE_YEAR}-erken-rezervasyon`,
          label: `${EARLY_BOOKING_PRICE_YEAR} kampanya sayfası`,
        },
        { href: buildCategoryPath("isitmali-havuzlu-villalar"), label: "Isıtmalı havuz" },
        { href: buildCategoryPath("balayi-villalari"), label: "Balayı villaları" },
        { href: "/tema/kis-tatili", label: "Kış tatili" },
        { href: "/villalar", label: `Tüm ${copy.plural.toLocaleLowerCase("tr")}` },
      ]
    : [
        { href: buildCategoryPath("isitmali-havuzlu-villalar"), label: "Isıtmalı havuzlu villalar" },
        { href: buildCategoryPath("kapali-havuzlu-villalar"), label: "Kapalı havuzlu villalar" },
        { href: buildCategoryPath("jakuzili-villalar"), label: "Jakuzili villalar" },
        {
          href: `/kampanyalar/${EARLY_BOOKING_PRICE_YEAR}-erken-rezervasyon`,
          label: "Erken rezervasyon",
        },
        { href: buildGuidePath("kalkan"), label: "Kalkan rehberi" },
        { href: "/villalar", label: `Tüm ${copy.plural.toLocaleLowerCase("tr")}` },
      ];

  const seo = topicGuideToListingSeo(guide, relatedLinks);
  const origin = `https://${site.domain}`;
  const path = temaPath(slug);
  const crumbs = [
    { label: "Ana Sayfa", href: "/" },
    { label: copy.rentalPlural, href: "/villalar" },
    { label: guide.h1 },
  ];
  const breadcrumbLd = buildBreadcrumbListJsonLd(
    origin,
    crumbs.map((c) => ({ name: c.label, path: c.href || path }))
  );
  const faqLd = buildFaqPageJsonLd(seo.faqs);
  const collectionLd = buildCollectionPageJsonLd({
    name: guide.h1,
    description: guide.description,
    path,
    origin,
    items: search.villas.slice(0, 20).map((villa) => ({
      name: villa.name,
      path: villaPublicPath(villa.slug),
    })),
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ListingBreadcrumbs items={crumbs} />
        <header className="mb-6 max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {guide.h1}
          </h1>
          <p className="mt-2 text-sm text-sky-700">
            {search.totalCount} {copy.singular.toLocaleLowerCase("tr")} listeleniyor
          </p>
        </header>

        <div className="space-y-4">
          {search.villas.map((villa, index) => (
            <VillaResultCard
              key={villa.id}
              villa={villa}
              nights={0}
              priority={index === 0}
            />
          ))}
          {search.villas.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-600">
              Bu temada şu an uygun ilan yok.{" "}
              <Link href="/villalar" className="text-sky-700 underline">
                Tüm {copy.plural.toLocaleLowerCase("tr")}
              </Link>
            </p>
          ) : null}
        </div>

        <ListingSeoSection content={seo} />
      </div>
    </div>
  );
}
