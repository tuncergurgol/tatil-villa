"use client";

import { useState } from "react";
import DeviceTokenField from "@/components/public/DeviceTokenField";
import SimpleCaptchaField from "@/components/public/SimpleCaptchaField";
import TurnstileField from "@/components/public/TurnstileField";

type Props = {
  resetKey?: number;
  className?: string;
};

/** Turnstile varsa onu, yoksa basit soruyu gösterir; device token her zaman eklenir. */
export default function PublicBotChallengeFields({
  resetKey = 0,
  className = "",
}: Props) {
  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const [localReset] = useState(resetKey);

  return (
    <div className={className}>
      <DeviceTokenField />
      {turnstileSiteKey ? (
        <TurnstileField
          siteKey={turnstileSiteKey}
          resetKey={resetKey || localReset}
        />
      ) : (
        <SimpleCaptchaField resetKey={resetKey || localReset} />
      )}
    </div>
  );
}
