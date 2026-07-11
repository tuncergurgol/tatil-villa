"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Images,
  Share2,
  X,
} from "lucide-react";

type VillaDetailGalleryProps = {
  name: string;
  images: string[];
};

export default function VillaDetailGallery({
  name,
  images,
}: VillaDetailGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const total = images.length;
  const main = images[0];
  const side = images.slice(1, 5);

  const close = useCallback(() => setLightboxIndex(null), []);
  const showPrev = useCallback(() => {
    setLightboxIndex((current) =>
      current === null ? null : (current - 1 + total) % total
    );
  }, [total]);
  const showNext = useCallback(() => {
    setLightboxIndex((current) =>
      current === null ? null : (current + 1) % total
    );
  }, [total]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* kullanıcı paylaşımı iptal etti */
    }
  }, [name]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, close, showPrev, showNext]);

  if (!main) return null;

  return (
    <>
      <div className="relative grid gap-1.5 overflow-hidden rounded-xl sm:grid-cols-4 sm:grid-rows-2 sm:min-h-[440px] sm:gap-2">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="relative aspect-[16/10] cursor-pointer overflow-hidden sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[440px]"
        >
          <Image
            src={main}
            alt={name}
            fill
            priority
            className="object-cover transition duration-300 hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </button>
        {side.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={() => setLightboxIndex(index + 1)}
            className="relative hidden aspect-[4/3] cursor-pointer overflow-hidden sm:block"
          >
            <Image
              src={src}
              alt={`${name} ${index + 2}`}
              fill
              className="object-cover transition duration-300 hover:scale-[1.03]"
              sizes="25vw"
            />
          </button>
        ))}

        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => setFavorited((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-md backdrop-blur hover:bg-white"
            aria-pressed={favorited}
          >
            <Heart
              className={`h-4 w-4 ${
                favorited ? "fill-rose-500 text-rose-500" : "text-slate-700"
              }`}
            />
            Favori
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-md backdrop-blur hover:bg-white"
          >
            {shareCopied ? (
              <Check className="h-4 w-4 text-teal-600" />
            ) : (
              <Share2 className="h-4 w-4 text-slate-700" />
            )}
            {shareCopied ? "Kopyalandı" : "Paylaş"}
          </button>
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-md backdrop-blur hover:bg-white"
          >
            <Images className="h-4 w-4" />
            Tümünü Göster
          </button>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Villa galerisi"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Kapat"
          >
            <X className="h-6 w-6" />
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={showPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
                aria-label="Önceki"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={showNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
                aria-label="Sonraki"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}
          <div className="relative h-[75vh] w-full max-w-5xl">
            <Image
              src={images[lightboxIndex]}
              alt={`${name} ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {lightboxIndex + 1} / {total}
          </p>
        </div>
      )}
    </>
  );
}
