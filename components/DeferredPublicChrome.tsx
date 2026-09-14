"use client";

import dynamic from "next/dynamic";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

const ScrollToTopButton = dynamic(() => import("@/components/ScrollToTopButton"), {
  ssr: false,
});
const CallbackFloatingButton = dynamic(
  () => import("@/components/CallbackFloatingButton"),
  { ssr: false }
);
const TatilAssistantWidget = dynamic(
  () => import("@/components/tatil-assistant/TatilAssistantWidget"),
  { ssr: false }
);

export default function DeferredPublicChrome({
  assistantWelcome,
}: {
  assistantWelcome: string | null;
}) {
  const ready = useDeferredMount(8000);
  if (!ready) return null;

  return (
    <>
      <ScrollToTopButton />
      <CallbackFloatingButton />
      {assistantWelcome ? (
        <TatilAssistantWidget welcomeMessage={assistantWelcome} />
      ) : null}
    </>
  );
}
