"use client";

import { useEffect } from "react";

/**
 * Public site içerik koruması (caydırıcı katman).
 * Tam kopya engeli web'de mümkün değildir; sağ tık / sürükle / seçimi zorlaştırır.
 */
export default function PublicContentProtection() {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (target.closest("img, picture, video, canvas, [data-protect-media]")) {
        event.preventDefault();
      }
    };

    const onDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("img, picture, video, canvas, [data-protect-media]")) {
        event.preventDefault();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const withMod = event.ctrlKey || event.metaKey;
      if (!withMod) return;

      // Ctrl/Cmd+S, Ctrl/Cmd+U, Ctrl/Cmd+P — kaynak / kaydet / yazdır kısayolları
      if (key === "s" || key === "u" || key === "p") {
        const target = event.target as HTMLElement | null;
        if (target?.closest("input, textarea, select, [contenteditable='true']")) {
          return;
        }
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
