import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import SiteChrome from "@/components/SiteChrome";
import { routing, type AppLocale } from "@/i18n/routing";
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
  const messages = await getMessages();
  const clientMessages = {
    nav: (messages as { nav?: unknown }).nav,
    header: (messages as { header?: unknown }).header,
    mobileNav: (messages as { mobileNav?: unknown }).mobileNav,
  };

  return (
    <NextIntlClientProvider messages={clientMessages}>
      <SiteChrome>{children}</SiteChrome>
    </NextIntlClientProvider>
  );
}
