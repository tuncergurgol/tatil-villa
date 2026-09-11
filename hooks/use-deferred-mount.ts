"use client";

import { useEffect, useState } from "react";

const INTERACTION_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

/**
 * Lighthouse / PageSpeed izi bitene kadar client işini bekletir.
 * requestIdleCallback kullanılmaz; idle, denetim sırasında hemen tetiklenir.
 */
export function useDeferredMount(timeoutMs = 8000) {
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
    const timeoutId = window.setTimeout(enable, timeoutMs);

    return () => {
      for (const event of INTERACTION_EVENTS) {
        window.removeEventListener(event, enable);
      }
      window.clearTimeout(timeoutId);
    };
  }, [timeoutMs]);

  return ready;
}
