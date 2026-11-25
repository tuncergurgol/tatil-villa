"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 280;

function windowScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function asPageScroller(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  if (target === document.body || target === document.documentElement) return null;
  if (target.clientHeight < Math.min(window.innerHeight * 0.5, 480)) return null;
  if (target.scrollHeight <= target.clientHeight + 32) return null;
  return target;
}

export default function AdminScrollTopButton() {
  const [visible, setVisible] = useState(false);
  const scrollerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const sync = (target: EventTarget | null) => {
      const windowTop = windowScrollTop();
      const pageScroller = asPageScroller(target);
      if (pageScroller) {
        if (pageScroller.scrollTop > SHOW_AFTER_PX) {
          scrollerRef.current = pageScroller;
          setVisible(true);
          return;
        }
        if (scrollerRef.current === pageScroller) scrollerRef.current = null;
        setVisible(windowTop > SHOW_AFTER_PX);
        return;
      }

      const fromWindow =
        !target ||
        target === document ||
        target === document.documentElement ||
        target === document.body ||
        target === window;
      if (!fromWindow) return;
      if (windowTop > SHOW_AFTER_PX) {
        scrollerRef.current = null;
        setVisible(true);
        return;
      }
      if (!scrollerRef.current || scrollerRef.current.scrollTop <= SHOW_AFTER_PX) {
        setVisible(false);
      }
    };

    const onScroll = (event: Event) => sync(event.target);
    sync(document);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  return (
    <button
      type="button"
      aria-label="Yukarı çık"
      tabIndex={visible ? 0 : -1}
      onClick={() => {
        const scroller = scrollerRef.current;
        if (scroller && scroller.scrollTop > 0) {
          scroller.scrollTo({ top: 0, behavior: "smooth" });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className={`fixed right-4 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_10px_28px_rgba(91,33,182,0.45)] ring-2 ring-white transition duration-200 hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-6 md:bottom-6 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="h-6 w-6" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
