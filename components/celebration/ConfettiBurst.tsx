"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

const DEFAULT_DURATION_MS = 5000;

type ConfettiBurstProps = {
  /** Animasyon süresi (ms); bitince bileşen unmount için onComplete çağırır */
  durationMs?: number;
  /** Süre dolunca true — parent success UI göstermeye devam eder, bu overlay kalkar */
  onComplete?: () => void;
  /** Overlay arka planı (varsayılan yarı saydam) */
  className?: string;
};

/**
 * 5 saniyelik havai fişek / konfeti patlaması; süre sonunda kendini kapatır.
 * /onay success ve public talep success ekranlarında kullanılır.
 */
export default function ConfettiBurst({
  durationMs = DEFAULT_DURATION_MS,
  onComplete,
  className,
}: ConfettiBurstProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    const end = Date.now() + durationMs;
    const colors = ["#0d9488", "#14b8a6", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

    const frame = () => {
      if (cancelled || Date.now() >= end) return;
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        zIndex: 9999,
      });
      rafId = requestAnimationFrame(frame);
    };

    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.55 },
      colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 80,
      spread: 160,
      startVelocity: 45,
      origin: { y: 0.4 },
      colors,
      zIndex: 9999,
    });

    rafId = requestAnimationFrame(frame);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setVisible(false);
      onComplete?.();
    }, durationMs);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
    };
  }, [durationMs, onComplete]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={
        className ??
        "pointer-events-none fixed inset-0 z-[90] bg-gradient-to-b from-teal-50/40 via-transparent to-amber-50/30"
      }
    />
  );
}
