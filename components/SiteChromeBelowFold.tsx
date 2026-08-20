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
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { siteConfig } from "@/lib/data";

const defaultQuickLinks = [
  { href: "/villalar", label: "Tüm Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsat Villalar" },
  { href: "/#bolgeler", label: "Popüler Bölgeler" },
  { href: "/#seyahat-macerasi", label: "Hizmetler" },
  { href: "/rezervasyon-dogrulama", label: "Rezervasyon Doğrulama" },
];

export default async function SiteChromeBelowFold() {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const brandName = site.brandName?.trim() || siteConfig.name;
  const phone = company.phone?.trim() || siteConfig.phone;

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
    getActiveFaqsForPublic({ limit: 8 }),
    getApprovedReviewsForPublic(6, site.key),
    getPublishedBlogPosts({ limit: 8 }),
    getBlogCategoriesForPublic(),
    getPublicSiteTracking(site.key),
  ]);

  const blogCategories = blogCategoryRows
    .filter((category) => category._count.posts > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }));

  const quickLinks =
    quickMenu.length > 0
      ? quickMenu.map((item) => ({ href: item.href, label: item.label }))
      : defaultQuickLinks;

  const corporateLinks = corporatePages.map((page) => ({
    href:
      page.slug === "sizi-arayalim"
        ? "/sizi-arayalim"
        : `/kurumsal/${page.slug}`,
    label: page.title,
  }));

  const socialLinks = buildCompanySocialLinks(company);

  return (
    <>
      <SiteTrackingScripts tracking={tracking} />
      <SitePreFooterAccordions
        faqs={faqs}
        reviews={reviews}
        posts={posts}
        blogCategories={blogCategories}
        brandName={brandName}
      />
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
