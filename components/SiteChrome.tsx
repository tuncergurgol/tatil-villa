import { Suspense } from "react";
import PublicContentProtection from "@/components/PublicContentProtection";
import SiteChromeBelowFold from "@/components/SiteChromeBelowFold";
import SiteChromeHeader from "@/components/SiteChromeHeader";
import SiteChromeMobileNav from "@/components/SiteChromeMobileNav";

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-gray-200 bg-white" />
  );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicContentProtection />
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
