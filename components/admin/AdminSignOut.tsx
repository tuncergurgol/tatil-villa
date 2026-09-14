"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";
import { adminSignOut } from "@/app/actions/admin/auth";

export default function AdminSignOut({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const showTip = useCallback(() => {
    if (!collapsed) return;
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.top + r.height / 2,
      left: r.left + r.width + 8,
    });
  }, [collapsed]);

  const hideTip = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.top + r.height / 2,
        left: r.left + r.width + 8,
      });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [pos]);

  return (
    <form action={adminSignOut}>
      <button
        ref={btnRef}
        type="submit"
        title="Çıkış Yap"
        aria-label="Çıkış Yap"
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        className={`flex items-center rounded-lg text-sm text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 ${
          collapsed
            ? "mx-auto h-10 w-10 justify-center"
            : "w-full gap-2 px-3 py-2"
        }`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Çıkış Yap</span>}
      </button>
      {collapsed &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-md"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: "translateY(-50%)",
              zIndex: 9999,
            }}
          >
            Çıkış Yap
          </span>,
          document.body
        )}
    </form>
  );
}
