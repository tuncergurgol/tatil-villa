import {
  buildBiletallIframeSrc,
  getBiletallIframeMeta,
  type BiletallCredentials,
  type BiletallIframeKind,
} from "@/lib/biletall";
import type { BiletallRouteRecord } from "@/lib/biletall-routes";

type BiletallIframeProps = {
  kind: BiletallIframeKind;
  portalSlug?: string | null;
  credentials?: BiletallCredentials;
  routes?: BiletallRouteRecord[];
  title: string;
};

export default function BiletallIframe({
  kind,
  portalSlug,
  credentials,
  routes,
  title,
}: BiletallIframeProps) {
  const meta = getBiletallIframeMeta(kind);
  const src = buildBiletallIframeSrc(kind, portalSlug, credentials, routes);

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <iframe
        id={meta.id}
        title={title}
        src={src}
        scrolling={meta.scrolling}
        className="block w-full border-0"
        style={{
          margin: 0,
          width: "100%",
          minHeight: meta.height,
          height: kind === "ara" ? "min(70vh, 420px)" : `${meta.height}px`,
        }}
        allow="payment *"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
