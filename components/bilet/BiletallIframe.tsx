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

export default function BiletallIframe({
  kind,
  portalSlug,
  credentials,
  routes,
  publicOrigin,
  title,
}: BiletallIframeProps) {
  const meta = getBiletallIframeMeta(kind);
  const src = resolveBiletallIframeSrc(
    kind,
    portalSlug,
    credentials,
    routes,
    publicOrigin
  );

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
          height: `${meta.height}px`,
        }}
        allow="payment *"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
