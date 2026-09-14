"use client";

import { usePathname } from "next/navigation";
import AdminMobileBottomBar from "@/components/admin/mobile/AdminMobileBottomBar";
import AdminMobileMenu from "@/components/admin/mobile/AdminMobileMenu";
import {
  AdminMobileNavProvider,
  useAdminMobileNav,
} from "@/components/admin/mobile/AdminMobileNavContext";

function AdminMobileLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { menuOpen, showDashboard } = useAdminMobileNav();
  const isAdminHome = pathname === "/admin";
  const showMenuHub = isAdminHome && menuOpen && !showDashboard;

  return (
    <>
      <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col md:hidden">
        {showMenuHub ? (
          <AdminMobileMenu />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
        )}
        <AdminMobileBottomBar />
      </div>

      <div className="hidden min-w-0 flex-1 md:block">{children}</div>
    </>
  );
}

export default function AdminMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminMobileNavProvider>
      <AdminMobileLayoutInner>{children}</AdminMobileLayoutInner>
    </AdminMobileNavProvider>
  );
}
