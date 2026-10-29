"use client";

import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileApiLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileApiLoad";

type Props = {
  siteKey: string;
  /** Form state hatası sonrası yeniden render tetiklemek için */
  resetKey?: string | number;
  className?: string;
};

export default function TurnstileField({
  siteKey,
  resetKey = 0,
  className = "",
}: Props) {
  const hostId = useId().replace(/:/g, "");
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    let cancelled = false;

    function mountWidget() {
      if (cancelled || !hostRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
      hostRef.current.innerHTML = "";
      setToken("");
      widgetIdRef.current = window.turnstile.render(hostRef.current, {
        sitekey: siteKey,
        theme: "light",
        size: "flexible",
        callback: (value) => setToken(value),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    }

    function ensureScript() {
      if (window.turnstile) {
        mountWidget();
        return;
      }
      const previous = window.onTurnstileApiLoad;
      window.onTurnstileApiLoad = () => {
        previous?.();
        if (!cancelled) mountWidget();
      };
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      } else if (window.turnstile) {
        mountWidget();
      }
    }

    ensureScript();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, resetKey]);

  return (
    <div className={className}>
      <input type="hidden" name="cfTurnstileToken" value={token} />
      <div
        id={`turnstile-${hostId}`}
        ref={hostRef}
        className="min-h-[65px] overflow-hidden rounded-2xl"
      />
      <p className="mt-1.5 text-[11px] text-[#1a4a5c]/50">
        Güvenlik doğrulaması Cloudflare Turnstile ile sağlanır.
      </p>
    </div>
  );
}
