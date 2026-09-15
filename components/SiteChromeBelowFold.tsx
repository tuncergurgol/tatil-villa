import { headers } from "next/headers";
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
import { getPublicListingCopy, maybeRewriteVillaWording } from "@/lib/public-listing-copy";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { siteConfig } from "@/lib/data";

const loyaltyQuickLink = { href: "/sadakat", label: "Sadakat Programı" };

function isOwnerCheckInPath(pathname: string): boolean {
  return /\/giris-bilgilendirme\/[^/]+\/evsahibi\/?$/.test(pathname);
}

export default async function SiteChromeBelowFold() {
  const headerList = await headers();
  const pathname = headerList.get("x-public-pathname") || "/";
  const hidePreFooter = isOwnerCheckInPath(pathname);

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const copy = getPublicListingCopy(site.key);
  const brandName = site.brandName?.trim() || siteConfig.name;
  const phone = company.phone?.trim() || siteConfig.phone;
  const defaultQuickLinks = [
    { href: "/villalar", label: copy.all },
    { href: "/villalar?filter=deal", label: copy.deals },
    { href: "/#bolgeler", label: "Popüler Bölgeler" },
    { href: "/#seyahat-macerasi", label: "Hizmetler" },
    { href: "/rezervasyon-dogrulama", label: "Rezervasyon Doğrulama" },
  ];

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
    getSiteMenuItemsForPublic("footer-quick"),
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
      ? quickMenu.map((item) => ({
          href: item.href,
          label: maybeRewriteVillaWording(item.label, site.key),
        }))
      : defaultQuickLinks),
    loyaltyQuickLink,
  ];

  const corporateLinks = corporatePages.map((page) => ({
    href:
      page.slug === "sizi-arayalim"
        ? "/sizi-arayalim"
        : `/kurumsal/${page.slug}`,
    label: maybeRewriteVillaWording(page.title, site.key),
  }));

  const socialLinks = buildCompanySocialLinks(company);

  return (
    <>
      <SiteTrackingScripts tracking={tracking} />
      {!hidePreFooter ? (
        <SitePreFooterAccordions
          faqs={faqs.map((faq) => ({
            ...faq,
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
        popularRegions={footerRegions.popular}
        mahalleRegions={footerRegions.mahalles}
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
