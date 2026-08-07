import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import TatilAssistantWidgetLoader from "@/components/tatil-assistant/TatilAssistantWidgetLoader";
import CallbackFloatingButton from "@/components/CallbackFloatingButton";
import MobileBottomNavigation from "@/components/MobileBottomNavigation";
import PublicContentProtection from "@/components/PublicContentProtection";
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
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteTracking } from "@/lib/queries/public-site-tracking";
import { getFooterRegionLinks } from "@/lib/queries/regions";
import { siteConfig } from "@/lib/data";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { buildCompanySocialLinks } from "@/lib/social-links";

const defaultHeaderLinks = [
  { href: "/villalar", label: "Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsatlar" },
  { href: "/#bolgeler", label: "Bölgeler" },
  { href: "/#kampanyalar", label: "Kampanyalar" },
  { href: "/sadakat", label: "Sadakat Programı" },
];

const defaultQuickLinks = [
  { href: "/villalar", label: "Tüm Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsat Villalar" },
  { href: "/#bolgeler", label: "Popüler Bölgeler" },
  { href: "/#seyahat-macerasi", label: "Hizmetler" },
  { href: "/rezervasyon-dogrulama", label: "Rezervasyon Doğrulama" },
];

export default async function SiteChrome({ children }: { children: React.ReactNode }) {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  const [
    headerMenu,
    quickMenu,
    corporatePages,
    footerRegions,
    faqs,
    reviews,
    posts,
    blogCategoryRows,
  ] = await Promise.all([
    getSiteMenuItemsForPublic("header"),
    getSiteMenuItemsForPublic("footer-quick"),
    getFooterCorporatePages(),
    getFooterRegionLinks(site.key),
    getActiveFaqsForPublic(),
    getApprovedReviewsForPublic(12, site.key),
    getPublishedBlogPosts({ limit: 24 }),
    getBlogCategoriesForPublic(),
  ]);
  const blogCategories = blogCategoryRows
    .filter((category) => category._count.posts > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }));
  const tracking = await getPublicSiteTracking(site.key);

  const headerLinks =
    headerMenu.length > 0
      ? headerMenu.map((item) => ({ href: item.href, label: item.label }))
      : defaultHeaderLinks;

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

  const brandName = site.brandName?.trim() || siteConfig.name;
  const phone = company.phone?.trim() || siteConfig.phone;
  const socialLinks = buildCompanySocialLinks(company);

  return (
    <>
      <PublicContentProtection />
      <SiteTrackingScripts tracking={tracking} />
      <Header
        navLinks={headerLinks}
        phone={phone}
        brandName={brandName}
        logoUrl={site.logoUrl}
        useDefaultLogo={site.useDefaultLogo}
        siteKey={site.key}
        agencyName={company.agencyName}
        tursabNo={company.tursabNo}
      />
      <main className="flex-1">{children}</main>
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
      <ScrollToTopButton />
      <TatilAssistantWidgetLoader />
      <CallbackFloatingButton />
      <MobileBottomNavigation
        phone={phone}
        whatsapp={company.whatsapp?.trim() || phone}
      />
    </>
  );
}
