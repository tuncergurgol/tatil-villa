"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface FloatingPanelProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
  align?: "start" | "center";
  fitContent?: boolean;
}

export default function FloatingPanel({
  open,
  anchorRef,
  panelRef,
  children,
  className = "",
  align = "start",
  fitContent = false,
}: FloatingPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const gap = 8;
      const viewportPadding = 12;

      if (fitContent) {
        setStyle({
          position: "fixed",
          top: rect.bottom + gap,
          left: "50%",
          transform: "translateX(-50%)",
          width: "max-content",
          maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
          zIndex: 200,
        });
        return;
      }

      const panelWidth = Math.min(
        align === "center"
          ? 720
          : Math.max(rect.width, 300),
        window.innerWidth - viewportPadding * 2
      );

      let left =
        align === "center"
          ? rect.left + rect.width / 2 - panelWidth / 2
          : rect.left;

      left = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - panelWidth - viewportPadding)
      );

      setStyle({
        position: "fixed",
        top: rect.bottom + gap,
        left,
        width: panelWidth,
        zIndex: 200,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, align, fitContent]);

  if (!mounted || !open) return null;

  return createPortal(
    <div ref={panelRef} style={style} className={className}>
      {children}
    </div>,
    document.body
  );
}
