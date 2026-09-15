import { Suspense } from "react";
import DeferredContentProtection from "@/components/DeferredContentProtection";
import { PublicListingCopyProvider } from "@/components/PublicListingCopyProvider";
import SiteChromeBelowFold from "@/components/SiteChromeBelowFold";
import SiteChromeHeader from "@/components/SiteChromeHeader";
import SiteChromeMobileNav from "@/components/SiteChromeMobileNav";
import { getPublicListingCopy } from "@/lib/public-listing-copy";

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 h-[4.75rem] border-b border-gray-200 bg-white md:h-[6.75rem]" />
  );
}

export default function SiteChrome({
  children,
  siteKey,
}: {
  children: React.ReactNode;
  siteKey?: string | null;
}) {
  return (
    <PublicListingCopyProvider value={getPublicListingCopy(siteKey)}>
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
  );
}
