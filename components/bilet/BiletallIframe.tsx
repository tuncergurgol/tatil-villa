import {
  buildBiletallIframeSrc,
  getBiletallIframeMeta,
  type BiletallIframeKind,
} from "@/lib/biletall";

type BiletallIframeProps = {
  kind: BiletallIframeKind;
  portalSlug?: string | null;
  title: string;
};

export default function BiletallIframe({
  kind,
  portalSlug,
  title,
}: BiletallIframeProps) {
  const meta = getBiletallIframeMeta(kind);
  const src = buildBiletallIframeSrc(kind, portalSlug);

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
