import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import DeferredContentProtection from "@/components/DeferredContentProtection";
import { PublicExchangeRatesProvider } from "@/components/PublicExchangeRatesProvider";
import { PublicListingCopyProvider } from "@/components/PublicListingCopyProvider";
import { getPublicExchangeRates } from "@/lib/exchange-rates";
import SiteChromeBelowFold from "@/components/SiteChromeBelowFold";
import SiteChromeHeader from "@/components/SiteChromeHeader";
import SiteChromeMobileNav from "@/components/SiteChromeMobileNav";
import { getPublicListingCopy } from "@/lib/public-listing-copy";

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 h-[4.75rem] border-b border-gray-200 bg-white md:h-[6.75rem]" />
  );
}

export default async function SiteChrome({
  children,
  siteKey,
}: {
  children: React.ReactNode;
  siteKey?: string | null;
}) {
  const locale = await getLocale();
  const exchangeRates =
    locale === "tr"
      ? null
      : await getPublicExchangeRates().catch(() => null);

  return (
    <PublicExchangeRatesProvider value={exchangeRates}>
      <PublicListingCopyProvider value={getPublicListingCopy(siteKey, locale)}>
        <DeferredContentProtection />
        <Suspense fallback={<HeaderFallback />}>
          <SiteChromeHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={null}>
          <SiteChromeBelowFold />
        </Suspense>
        <Suspense fallback={null}>
          <SiteChromeMobileNav />
        </Suspense>
      </PublicListingCopyProvider>
    </PublicExchangeRatesProvider>
  );
}
