"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type PriceInfoTipProps = {
  label: string;
  children: ReactNode;
};

/** Turuncu i ikonu + koyu tooltip; dışarı tıklanınca kapanır */
export default function PriceInfoTip({ label, children }: PriceInfoTipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold leading-none text-white transition hover:bg-orange-600"
      >
        i
      </button>

      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute bottom-[calc(100%+10px)] left-1/2 z-30 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-zinc-900 px-3 py-2 text-center text-[11px] leading-snug text-white shadow-lg"
        >
          {children}
          <span
            aria-hidden
            className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-zinc-900"
          />
        </span>
      ) : null}
    </span>
  );
}
