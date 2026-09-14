"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { MobileMenuFrame } from "@/lib/admin-mobile-menu";

type AdminMobileNavContextValue = {
  menuOpen: boolean;
  menuStack: MobileMenuFrame[];
  showDashboard: boolean;
  goDashboard: () => void;
  goBack: () => void;
  pushSection: (frame: MobileMenuFrame) => void;
  canGoBack: boolean;
};

const AdminMobileNavContext = createContext<AdminMobileNavContextValue | null>(
  null
);

export function AdminMobileNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminHome = pathname === "/admin";
  const [showDashboard, setShowDashboard] = useState(false);
  const [menuStack, setMenuStack] = useState<MobileMenuFrame[]>([{ type: "root" }]);

  const resetMenuStack = useCallback(() => {
    setMenuStack([{ type: "root" }]);
  }, []);

  useEffect(() => {
    if (!isAdminHome) {
      setShowDashboard(false);
      resetMenuStack();
    }
  }, [isAdminHome, resetMenuStack]);

  const menuOpen = isAdminHome && !showDashboard;

  const goDashboard = useCallback(() => {
    if (!isAdminHome) {
      router.push("/admin");
      setShowDashboard(false);
      resetMenuStack();
      return;
    }

    setShowDashboard(true);
    resetMenuStack();
  }, [isAdminHome, resetMenuStack, router]);

  const goBack = useCallback(() => {
    if (isAdminHome && showDashboard) {
      setShowDashboard(false);
      resetMenuStack();
      return;
    }

    if (menuOpen && menuStack.length > 1) {
      setMenuStack((prev) => prev.slice(0, -1));
      return;
    }

    if (menuOpen && menuStack.length === 1) {
      setShowDashboard(true);
      resetMenuStack();
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/admin");
    setShowDashboard(false);
    resetMenuStack();
  }, [menuOpen, menuStack.length, resetMenuStack, router]);

  const pushSection = useCallback((frame: MobileMenuFrame) => {
    setMenuStack((prev) => [...prev, frame]);
  }, []);

  const canGoBack =
    (isAdminHome && showDashboard) ||
    (menuOpen && menuStack.length > 1) ||
    (menuOpen && menuStack.length === 1) ||
    !isAdminHome;

  const value = useMemo(
    () => ({
      menuOpen,
      menuStack,
      showDashboard,
      goDashboard,
      goBack,
      pushSection,
      canGoBack,
    }),
    [
      menuOpen,
      menuStack,
      showDashboard,
      goDashboard,
      goBack,
      pushSection,
      canGoBack,
    ]
  );

  return (
    <AdminMobileNavContext.Provider value={value}>
      {children}
    </AdminMobileNavContext.Provider>
  );
}

export function useAdminMobileNav() {
  const context = useContext(AdminMobileNavContext);
  if (!context) {
    throw new Error("useAdminMobileNav must be used within AdminMobileNavProvider");
  }
  return context;
}
