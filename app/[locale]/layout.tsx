import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import SiteChrome from "@/components/SiteChrome";
import { routing, type AppLocale } from "@/i18n/routing";
import { overlayTesisClientMessages } from "@/lib/public-listing-copy";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  publicIndexingRobots,
  isIndexableLocale,
  shouldNoindexPublicUrl,
  canonicalPublicPath,
} from "@/lib/public-indexing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const headerList = await headers();
  const pathname = headerList.get("x-public-pathname") || "/";
  const search = headerList.get("x-public-search") || "";
  const indexable =
    isIndexableLocale(locale) && !shouldNoindexPublicUrl(pathname, search);
  const canonical = canonicalPublicPath(pathname, search);

  return {
    robots: publicIndexingRobots(indexable),
    alternates: { canonical },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [messages, company] = await Promise.all([
    getMessages(),
    getCompanySettings(),
  ]);
  const site = await getPublicSiteProfile(company);
  const clientMessages = overlayTesisClientMessages(
    {
      nav: (messages as { nav?: Record<string, unknown> }).nav,
      header: (messages as { header?: Record<string, unknown> }).header,
      mobileNav: (messages as { mobileNav?: Record<string, unknown> }).mobileNav,
    },
    site.key
  );

  return (
    <NextIntlClientProvider messages={clientMessages}>
      <SiteChrome siteKey={site.key}>{children}</SiteChrome>
    </NextIntlClientProvider>
  );
}
