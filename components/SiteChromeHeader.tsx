import { getLocale, getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import Theme2Header from "@/components/theme-2/Theme2Header";
import { chromeMessages } from "@/lib/i18n/chrome-messages";
import { localizeNavLabel } from "@/lib/i18n/localize-public-label";
import type { AppLocale } from "@/i18n/routing";
import { getSiteMenuItemsForPublic } from "@/lib/queries/site-menus";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { siteConfig } from "@/lib/data";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  canonicalOriginFromDomain,
} from "@/lib/search-discovery";
import { buildCompanySocialLinks } from "@/lib/social-links";

export default async function SiteChromeHeader() {
  const [company, locale, tNav, tMobile] = await Promise.all([
    getCompanySettings(),
    getLocale(),
    getTranslations("nav"),
    getTranslations("mobileNav"),
  ]);
  const site = await getPublicSiteProfile(company);
  const headerMenu = await getSiteMenuItemsForPublic("header", site.key);
  const chrome = chromeMessages[(locale as AppLocale) in chromeMessages ? (locale as AppLocale) : "en"];

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

  const defaultHeaderLinks = [
    { href: "/villalar", label: tNav("villas") },
    { href: "/villalar?filter=deal", label: tNav("deals") },
    { href: "/#bolgeler", label: tNav("regions") },
    { href: "/#kampanyalar", label: tNav("campaigns") },
    { href: "/sadakat", label: tNav("loyalty") },
  ];

  const theme2DefaultHeaderLinks = [
    { href: "/villalar", label: chrome.accommodations },
    { href: "/villalar?facilities=Bungalov", label: chrome.bungalow },
    { href: "/villalar?facilities=Domes", label: chrome.domes },
    { href: "/#bolgeler", label: tNav("regions") },
  ];

  const headerLinks =
    site.homeTheme === "theme-2"
      ? theme2DefaultHeaderLinks
      : headerMenu.length > 0
        ? headerMenu.map((item) => ({
            href: item.href,
            label:
              locale === "tr"
                ? item.label
                : localizeNavLabel(
                    item.href,
                    item.label,
                    chrome,
                    nav,
                    weWillCallYou
                  ),
          }))
        : defaultHeaderLinks;

  const brandName = site.brandName?.trim() || siteConfig.name;
  const phone = company.phone?.trim() || siteConfig.phone;
  const origin = canonicalOriginFromDomain(site.domain);
  const organizationJsonLd = buildOrganizationJsonLd({
    origin,
    brandName,
    companyTitle: company.companyTitle,
    description: site.seoDescription,
    logoUrl: site.logoUrl,
    email: company.email,
    phone,
    address: company.address,
    sameAs: buildCompanySocialLinks(company).map((link) => link.href),
  });
  const websiteJsonLd = buildWebSiteJsonLd({
    origin,
    brandName,
    description: site.seoDescription,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {site.homeTheme === "theme-2" ? (
        <Theme2Header
          navLinks={headerLinks}
          brandName={brandName}
          logoUrl={site.logoUrl}
          agencyName={company.agencyName}
          tursabNo={company.tursabNo}
          phone={phone}
        />
      ) : (
        <Header
          navLinks={headerLinks}
          brandName={brandName}
          logoUrl={site.logoUrl}
          useDefaultLogo={site.useDefaultLogo}
          siteKey={site.key}
          agencyName={company.agencyName}
          tursabNo={company.tursabNo}
          phone={phone}
        />
      )}
    </>
  );
}
