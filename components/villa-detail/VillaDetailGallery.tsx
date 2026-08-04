"use client";

import GalleryImage from "@/components/GalleryImage";
import MemberFavoriteButton from "@/components/member/MemberFavoriteButton";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
  Share2,
  X,
} from "lucide-react";

type VillaDetailGalleryProps = {
  villaId: string;
  name: string;
  images: string[];
};

export default function VillaDetailGallery({
  villaId,
  name,
  images,
}: VillaDetailGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [mobileSlide, setMobileSlide] = useState(0);
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
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

  const handleMobileScroll = useCallback(() => {
    const track = mobileTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
    setMobileSlide(Math.min(Math.max(nextIndex, 0), Math.max(total - 1, 0)));
  }, [total]);

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

  const actionButtons = (
    <div className="absolute right-3 top-3 z-10 flex gap-2">
      <MemberFavoriteButton villaId={villaId} variant="pill" />
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
  );

  return (
    <>
      {/* Mobil: tüm fotoğraflar sırayla kaydırılabilir */}
      <div className="relative sm:hidden">
        <div
          ref={mobileTrackRef}
          onScroll={handleMobileScroll}
          className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto rounded-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, index) => (
            <button
              key={`mobile-${src}-${index}`}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="relative aspect-[16/10] w-full shrink-0 snap-center overflow-hidden"
            >
              <GalleryImage
                src={src}
                alt={`${name} ${index + 1}`}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="100vw"
              />
            </button>
          ))}
        </div>

        {actionButtons}

        {total > 1 ? (
          <>
            <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
              {mobileSlide + 1} / {total}
            </p>
            <button
              type="button"
              onClick={() => setLightboxIndex(mobileSlide)}
              className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-md backdrop-blur hover:bg-white"
            >
              <Images className="h-4 w-4" />
              Tümünü Göster
            </button>
          </>
        ) : null}
      </div>

      {/* Masaüstü: mevcut grid */}
      <div className="relative hidden gap-2 overflow-hidden rounded-xl sm:grid sm:min-h-[440px] sm:grid-cols-4 sm:grid-rows-2">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="relative col-span-2 row-span-2 min-h-[440px] cursor-pointer overflow-hidden"
        >
          <GalleryImage
            src={main}
            alt={name}
            fill
            priority
            className="object-cover transition duration-300 hover:scale-[1.02]"
            sizes="50vw"
          />
        </button>
        {side.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={() => setLightboxIndex(index + 1)}
            className="relative aspect-[4/3] cursor-pointer overflow-hidden"
          >
            <GalleryImage
              src={src}
              alt={`${name} ${index + 2}`}
              fill
              className="object-cover transition duration-300 hover:scale-[1.03]"
              sizes="25vw"
            />
          </button>
        ))}

        {actionButtons}

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
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null || total <= 1) return;
            const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
            const delta = endX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) < 40) return;
            if (delta > 0) showPrev();
            else showNext();
          }}
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
            <GalleryImage
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
