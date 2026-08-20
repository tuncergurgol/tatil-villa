import { Suspense } from "react";
import DeferredContentProtection from "@/components/DeferredContentProtection";
import SiteChromeBelowFold from "@/components/SiteChromeBelowFold";
import SiteChromeHeader from "@/components/SiteChromeHeader";
import SiteChromeMobileNav from "@/components/SiteChromeMobileNav";

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 h-[10.75rem] border-b border-gray-200 bg-white md:h-[6.75rem]" />
  );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
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
    </>
  );
}
