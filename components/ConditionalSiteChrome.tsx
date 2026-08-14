"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ConditionalSiteChrome({
  adminContent,
  publicContent,
}: {
  adminContent: React.ReactNode;
  publicContent: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    document.body.classList.toggle("admin-shell", isAdmin);
    return () => {
      document.body.classList.remove("admin-shell");
    };
  }, [isAdmin]);

  if (isAdmin) {
    return <>{adminContent}</>;
  }

  return <>{publicContent}</>;
}
