import { Bus, Plane } from "lucide-react";
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
  title: string;
};

const FRAME_LAYOUT: Record<
  BiletallIframeKind,
  { maxWidth: string; height: number; compact?: boolean }
> = {
  ara: { maxWidth: "28rem", height: 400, compact: true },
  satinal: { maxWidth: "64rem", height: 1600 },
  sonuc: { maxWidth: "64rem", height: 670 },
};

export default function BiletallIframe({
  kind,
  portalSlug,
  credentials,
  routes,
  publicOrigin,
  title,
}: BiletallIframeProps) {
  const meta = getBiletallIframeMeta(kind);
  const layout = FRAME_LAYOUT[kind];
  const src = resolveBiletallIframeSrc(
    kind,
    portalSlug,
    credentials,
    routes,
    publicOrigin
  );

  return (
    <div
      className="w-full overflow-hidden rounded-3xl border border-white/90 bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-100/80"
      style={{ maxWidth: layout.maxWidth }}
    >
      {layout.compact ? (
        <div className="flex items-center justify-center gap-2 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-orange-50 px-4 py-3">
          <Plane className="size-4 text-sky-600" strokeWidth={2.2} aria-hidden />
          <span className="text-xs font-semibold tracking-wide text-slate-600 sm:text-sm">
            Uçak &amp; Otobüs bileti ara
          </span>
          <Bus className="size-4 text-orange-500" strokeWidth={2.2} aria-hidden />
        </div>
      ) : null}

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
        }}
        allow="payment *"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
