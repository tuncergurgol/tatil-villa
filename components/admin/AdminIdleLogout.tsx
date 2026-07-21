"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

const IDLE_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export default function AdminIdleLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void signOut({ callbackUrl: "/admin/login?reason=idle" });
    }, IDLE_MS);
  }, []);

  useEffect(() => {
    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [resetTimer]);

  return null;
}
