"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom))] right-4 z-[64] flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-rose-500 text-white shadow-lg transition hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 sm:bottom-6 sm:right-6 sm:rounded-full sm:border-0 sm:bg-sky-600 sm:hover:bg-sky-700"
      aria-label="Sayfanın başına dön"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
