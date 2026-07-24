"use client";

import { useEffect, useMemo, useState } from "react";
import { Bus, Plane } from "lucide-react";
import { appendRawBiletallForwardSearch } from "@/lib/biletall-callbacks";
import {
  getBiletallIframeMeta,
  resolveBiletallIframeSrc,
  type BiletallCredentials,
  type BiletallIframeKind,
} from "@/lib/biletall";
import type { BiletallRouteRecord } from "@/lib/biletall-routes";

type BiletallIframeProps = {
  kind: BiletallIframeKind;
  portalSlug?: string | null;
  credentials?: BiletallCredentials;
  routes?: BiletallRouteRecord[];
  publicOrigin?: string;
  siteHostname?: string;
  title: string;
  enlarged?: boolean;
  /** Biletall yönlendirmesindeki oturum parametrelerini tarayıcıdan ham olarak ilet. */
  forwardSessionQuery?: boolean;
};

const FRAME_LAYOUT: Record<
  BiletallIframeKind,
  { maxWidth: string; height: number; compact?: boolean }
> = {
  ara: { maxWidth: "28rem", height: 400, compact: true },
  satinal: { maxWidth: "64rem", height: 1600 },
  sonuc: { maxWidth: "64rem", height: 670 },
};

const ENLARGED_ARA_LAYOUT = { maxWidth: "36rem", height: 480 };

export default function BiletallIframe({
  kind,
  portalSlug,
  credentials,
  routes,
  publicOrigin,
  siteHostname,
  title,
  enlarged = false,
  forwardSessionQuery = false,
}: BiletallIframeProps) {
  const meta = getBiletallIframeMeta(kind);
  const layout =
    enlarged && kind === "ara"
      ? { ...FRAME_LAYOUT.ara, ...ENLARGED_ARA_LAYOUT }
      : FRAME_LAYOUT[kind];

  const baseSrc = useMemo(
    () =>
      resolveBiletallIframeSrc(
        kind,
        portalSlug,
        credentials,
        routes,
        publicOrigin,
        siteHostname
      ),
    [kind, portalSlug, credentials, routes, publicOrigin, siteHostname]
  );

  const [src, setSrc] = useState<string | null>(
    forwardSessionQuery ? null : baseSrc
  );

  useEffect(() => {
    if (!forwardSessionQuery) {
      setSrc(baseSrc);
      return;
    }

    setSrc(appendRawBiletallForwardSearch(baseSrc, window.location.search));
  }, [baseSrc, forwardSessionQuery]);

  return (
    <div
      className="w-full overflow-hidden rounded-3xl border border-white/90 bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-100/80"
      style={{ maxWidth: layout.maxWidth }}
    >
      {layout.compact ? (
        <div
          className={`flex items-center justify-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-orange-50 px-4 ${enlarged ? "py-4" : "py-3"}`}
        >
          <Plane
            className={enlarged ? "size-5 text-sky-600" : "size-4 text-sky-600"}
            strokeWidth={2.2}
            aria-hidden
          />
          <span
            className={`font-semibold tracking-wide text-slate-600 ${enlarged ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}
          >
            Uçak &amp; Otobüs bileti ara
          </span>
          <Bus
            className={enlarged ? "size-5 text-orange-500" : "size-4 text-orange-500"}
            strokeWidth={2.2}
            aria-hidden
          />
        </div>
      ) : null}

      {src ? (
        <iframe
          id={meta.id}
          title={title}
          src={src}
          scrolling={meta.scrolling}
          className="block w-full border-0 bg-white"
          style={{
            margin: 0,
            width: "100%",
            minHeight: layout.height,
            height: `${layout.height}px`,
            ...(enlarged ? { zoom: 1.12 } : {}),
          }}
          allow="payment *"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div
          className="flex items-center justify-center bg-white text-sm font-medium text-slate-500"
          style={{ minHeight: layout.height, height: `${layout.height}px` }}
        >
          Bilet ekranı yükleniyor…
        </div>
      )}
    </div>
  );
}
