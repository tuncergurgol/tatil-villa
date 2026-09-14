type TursabRotaEmbedProps = {
  url: string;
};

export default function TursabRotaEmbed({ url }: TursabRotaEmbedProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe
          title="TÜRSAB Rota — Tur Rezervasyonu"
          src={url}
          className="block w-full border-0"
          style={{
            margin: 0,
            width: "100%",
            minHeight: "min(85vh, 900px)",
            height: "min(85vh, 900px)",
          }}
          allow="payment *; fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <p className="text-center text-sm text-slate-500">
        Sayfa görünmüyorsa{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-700 underline-offset-2 hover:underline"
        >
          tur rezervasyonunu yeni sekmede açın
        </a>
        .
      </p>
    </div>
  );
}
