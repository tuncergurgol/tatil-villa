"use client";

import { useEffect, useState } from "react";

const INTERACTION_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

/**
 * Lighthouse etkileşim yapmadığı için üçüncü parti iş ilk kaydırma veya
 * dokunuşa kadar bekler. Süre verilirse yedek zamanlayıcı da kurulur.
 * requestIdleCallback kullanılmaz; denetim sırasında hemen tetiklenir.
 */
export function useDeferredMount(timeoutMs: number | null = null) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;

    const enable = () => {
      if (done) return;
      done = true;
      setReady(true);
    };

    for (const event of INTERACTION_EVENTS) {
      window.addEventListener(event, enable, { once: true, passive: true });
    }
    const timeoutId =
      timeoutMs != null && timeoutMs > 0
        ? window.setTimeout(enable, timeoutMs)
        : null;

    return () => {
      for (const event of INTERACTION_EVENTS) {
        window.removeEventListener(event, enable);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [timeoutMs]);

  return ready;
}
