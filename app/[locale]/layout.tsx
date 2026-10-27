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
  const typedMessages = messages as {
    nav?: Record<string, unknown>;
    header?: Record<string, unknown>;
    mobileNav?: Record<string, unknown>;
    common?: Record<string, unknown>;
    home?: Record<string, unknown>;
    footer?: Record<string, unknown>;
    villa?: Record<string, unknown>;
    booking?: Record<string, unknown>;
    search?: Record<string, unknown>;
    services?: Record<string, unknown>;
    chrome?: Record<string, unknown>;
  };
  const clientMessages = overlayTesisClientMessages(
    {
      nav: typedMessages.nav,
      header: typedMessages.header,
      mobileNav: typedMessages.mobileNav,
      common: typedMessages.common,
      home: typedMessages.home,
      footer: typedMessages.footer,
      villa: typedMessages.villa,
      booking: typedMessages.booking,
      search: typedMessages.search,
      services: typedMessages.services,
      chrome: typedMessages.chrome,
    },
    site.key
  );

  return (
    <NextIntlClientProvider messages={clientMessages}>
      <SiteChrome siteKey={site.key}>{children}</SiteChrome>
    </NextIntlClientProvider>
  );
}
