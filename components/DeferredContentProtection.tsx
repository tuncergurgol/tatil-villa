"use client";

import dynamic from "next/dynamic";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

const PublicContentProtection = dynamic(
  () => import("@/components/PublicContentProtection"),
  { ssr: false }
);

export default function DeferredContentProtection() {
  const ready = useDeferredMount(8000);
  if (!ready) return null;
  return <PublicContentProtection />;
}
