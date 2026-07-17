import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import CallbackFloatingButton from "@/components/CallbackFloatingButton";
import SitePreFooterAccordions from "@/components/SitePreFooterAccordions";
import {
  getFooterCorporatePages,
  getActiveFaqsForPublic,
  getApprovedReviewsForPublic,
  getPublishedBlogPosts,
} from "@/lib/queries/cms-content";
import { getSiteMenuItemsForPublic } from "@/lib/queries/site-menus";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getFooterRegionLinks } from "@/lib/queries/regions";
import { siteConfig } from "@/lib/data";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

const defaultHeaderLinks = [
  { href: "/villalar", label: "Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsatlar" },
  { href: "/#bolgeler", label: "Bölgeler" },
  { href: "/#kampanyalar", label: "Kampanyalar" },
];

const defaultQuickLinks = [
  { href: "/villalar", label: "Tüm Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsat Villalar" },
  { href: "/#bolgeler", label: "Popüler Bölgeler" },
  { href: "/#seyahat-macerasi", label: "Hizmetler" },
];

export default async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [
    headerMenu,
    quickMenu,
    corporatePages,
    company,
    footerRegions,
    faqs,
    reviews,
    posts,
  ] = await Promise.all([
    getSiteMenuItemsForPublic("header"),
    getSiteMenuItemsForPublic("footer-quick"),
    getFooterCorporatePages(),
    getCompanySettings(),
    getFooterRegionLinks(),
    getActiveFaqsForPublic({ limit: 18 }),
    getApprovedReviewsForPublic(6),
    getPublishedBlogPosts({ limit: 6 }),
  ]);
  const site = await getPublicSiteProfile(company);

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

  return (
    <>
      <Header
        navLinks={headerLinks}
        phone={phone}
        brandName={brandName}
        logoUrl={site.logoUrl}
        useDefaultLogo={site.useDefaultLogo}
        agencyName={company.agencyName}
        tursabNo={company.tursabNo}
      />
      <main className="flex-1">{children}</main>
      <SitePreFooterAccordions faqs={faqs} reviews={reviews} posts={posts} />
      <Footer
        quickLinks={quickLinks}
        corporateLinks={corporateLinks}
        popularRegions={footerRegions.popular}
        mahalleRegions={footerRegions.mahalles}
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
      <CallbackFloatingButton />
    </>
  );
}
