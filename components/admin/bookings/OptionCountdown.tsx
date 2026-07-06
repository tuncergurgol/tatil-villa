"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Süre doldu";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} sa`);
  parts.push(`${String(minutes).padStart(2, "0")} dk`);
  parts.push(`${String(seconds).padStart(2, "0")} sn`);

  return parts.join(" ");
}

interface OptionCountdownProps {
  expiresAt: Date | string | null;
  className?: string;
}

export default function OptionCountdown({
  expiresAt,
  className = "",
}: OptionCountdownProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(null);
      return;
    }

    const target = new Date(expiresAt).getTime();

    function tick() {
      setRemainingMs(Math.max(0, target - Date.now()));
    }

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt]);

  if (!expiresAt || remainingMs == null) return null;

  const expired = remainingMs <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
        expired
          ? "bg-red-100 text-red-700"
          : "bg-orange-100 text-orange-800"
      } ${className}`}
      title="Opsiyon süresi"
    >
      <Clock className="h-3.5 w-3.5" />
      {expired ? "Opsiyon süresi doldu" : `Opsiyon: ${formatCountdown(remainingMs)}`}
    </span>
  );
}
