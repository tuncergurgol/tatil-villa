"use client";

import { usePathname } from "next/navigation";

export default function ConditionalSiteChrome({
  adminContent,
  publicContent,
}: {
  adminContent: React.ReactNode;
  publicContent: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{adminContent}</>;
  }

  return <>{publicContent}</>;
}
