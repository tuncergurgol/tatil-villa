import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import Footer from "@/components/Footer";
import TatilAssistantWidgetLoader from "@/components/tatil-assistant/TatilAssistantWidgetLoader";
import SitePreFooterAccordions from "@/components/SitePreFooterAccordions";
import SiteTrackingScripts from "@/components/SiteTrackingScripts";
import {
  getFooterCorporatePages,
  getActiveFaqsForPublic,
  getApprovedReviewsForPublic,
  getBlogCategoriesForPublic,
  getPublishedBlogPosts,
} from "@/lib/queries/cms-content";
import { getSiteMenuItemsForPublic } from "@/lib/queries/site-menus";
import { getPublicSiteTracking } from "@/lib/queries/public-site-tracking";
import { getFooterRegionLinks } from "@/lib/queries/regions";
import { buildCompanySocialLinks } from "@/lib/social-links";
import {
  getPublicListingCopy,
  maybeRewriteVillaWording,
} from "@/lib/public-listing-copy";
import { chromeMessages } from "@/lib/i18n/chrome-messages";
import {
  localizeCorporateSlug,
  localizeNavLabel,
} from "@/lib/i18n/localize-public-label";
import type { AppLocale } from "@/i18n/routing";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { siteConfig } from "@/lib/data";

function isOwnerCheckInPath(pathname: string): boolean {
  return /\/giris-bilgilendirme\/[^/]+\/evsahibi\/?$/.test(pathname);
}

export default async function SiteChromeBelowFold() {
  const headerList = await headers();
  const pathname = headerList.get("x-public-pathname") || "/";
  const hidePreFooter = isOwnerCheckInPath(pathname);

  const [company, locale, tNav, tMobile] = await Promise.all([
    getCompanySettings(),
    getLocale(),
    getTranslations("nav"),
    getTranslations("mobileNav"),
  ]);
  const site = await getPublicSiteProfile(company);
  const chrome =
    chromeMessages[(locale as AppLocale) in chromeMessages ? (locale as AppLocale) : "en"];
  const nav = {
    villas: tNav("villas"),
    deals: tNav("deals"),
    regions: tNav("regions"),
    campaigns: tNav("campaigns"),
    loyalty: tNav("loyalty"),
    allVillas: tNav("allVillas"),
    dealVillas: tNav("dealVillas"),
    reservationVerify: tNav("reservationVerify"),
    services: tNav("services"),
  };
  const weWillCallYou = tMobile("weWillCallYou");
  const brandName = site.brandName?.trim() || siteConfig.name;
  const phone = company.phone?.trim() || siteConfig.phone;
  const defaultQuickLinks = [
    { href: "/villalar", label: tNav("allVillas") },
    { href: "/villalar?filter=deal", label: tNav("dealVillas") },
    { href: "/#bolgeler", label: tNav("popularRegions") },
    { href: "/#seyahat-macerasi", label: tNav("services") },
    { href: "/rezervasyon-dogrulama", label: tNav("reservationVerify") },
  ];

  function localizeRegionLabel(label: string): string {
    if (locale === "tr") return label;
    const copy = getPublicListingCopy(site.key, locale);
    return label
      .replace(/Kiralık Villalar/gi, copy.rentalPlural)
      .replace(/Kiralık Villa/gi, copy.rentalSingular)
      .replace(/Kiralık Tesisler/gi, copy.rentalPlural)
      .replace(/Kiralık Tesis/gi, copy.rentalSingular)
      .replace(/Villas for Rent/gi, copy.rentalPlural)
      .replace(/Villa for Rent/gi, copy.rentalSingular)
      .replace(/Properties for Rent/gi, copy.rentalPlural)
      .replace(/Property for Rent/gi, copy.rentalSingular);
  }

  const [
    quickMenu,
    corporatePages,
    footerRegions,
    faqs,
    reviews,
    posts,
    blogCategoryRows,
    tracking,
  ] = await Promise.all([
    getSiteMenuItemsForPublic("footer-quick", site.key),
    getFooterCorporatePages(),
    getFooterRegionLinks(site.key),
    hidePreFooter
      ? Promise.resolve(
          [] as Awaited<ReturnType<typeof getActiveFaqsForPublic>>
        )
      : getActiveFaqsForPublic({ limit: 8 }),
    hidePreFooter
      ? Promise.resolve(
          [] as Awaited<ReturnType<typeof getApprovedReviewsForPublic>>
        )
      : getApprovedReviewsForPublic(6, site.key),
    hidePreFooter
      ? Promise.resolve(
          [] as Awaited<ReturnType<typeof getPublishedBlogPosts>>
        )
      : getPublishedBlogPosts({ limit: 8 }),
    hidePreFooter
      ? Promise.resolve(
          [] as Awaited<ReturnType<typeof getBlogCategoriesForPublic>>
        )
      : getBlogCategoriesForPublic(),
    getPublicSiteTracking(site.key),
  ]);

  const blogCategories = blogCategoryRows
    .filter((category) => category._count.posts > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }));

  const quickLinks = [
    ...(quickMenu.length > 0
      ? quickMenu.map((item) => {
          const raw = maybeRewriteVillaWording(item.label, site.key);
          return {
            href: item.href,
            label:
              locale === "tr"
                ? raw
                : localizeNavLabel(item.href, raw, chrome, nav, weWillCallYou),
          };
        })
      : defaultQuickLinks),
  ];

  const corporateLinks = corporatePages.map((page) => {
    const href =
      page.slug === "sizi-arayalim"
        ? "/sizi-arayalim"
        : `/kurumsal/${page.slug}`;
    const raw = maybeRewriteVillaWording(page.title, site.key);
    return {
      href,
      label:
        locale === "tr"
          ? raw
          : localizeCorporateSlug(page.slug, raw, chrome, weWillCallYou),
    };
  });

  const socialLinks = buildCompanySocialLinks(company);

  return (
    <>
      <SiteTrackingScripts tracking={tracking} />
      {!hidePreFooter ? (
        <SitePreFooterAccordions
          faqs={faqs.map((faq) => ({
            ...faq,
            slug: faq.slug,
            question: maybeRewriteVillaWording(faq.question, site.key),
            answer: maybeRewriteVillaWording(faq.answer, site.key),
          }))}
          reviews={reviews}
          posts={posts}
          blogCategories={blogCategories}
          brandName={brandName}
        />
      ) : null}
      <Footer
        quickLinks={quickLinks}
        corporateLinks={corporateLinks}
        popularRegions={footerRegions.popular.map((region) => ({
          ...region,
          label: localizeRegionLabel(region.label),
        }))}
        mahalleRegions={footerRegions.mahalles.map((region) => ({
          ...region,
          label: localizeRegionLabel(region.label),
        }))}
        socialLinks={socialLinks}
        contact={{
          phone,
          email: company.email,
          address: company.address,
          workingHours: company.workingHours,
          agencyName: company.agencyName,
          tursabNo: company.tursabNo,
          brandName,
          companyTitle: company.companyTitle,
          logoUrl: site.logoUrl,
          useDefaultLogo: site.useDefaultLogo,
          tursabVerificationLogoUrl: company.tursabVerificationLogoUrl,
        }}
      />
      <TatilAssistantWidgetLoader />
    </>
  );
}
