"use client";

import GalleryImage from "@/components/GalleryImage";
import MemberFavoriteButton from "@/components/member/MemberFavoriteButton";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

function slideIndexFromScroll(track: HTMLDivElement, total: number) {
  const width = track.clientWidth;
  if (width <= 0 || total <= 0) return 0;
  return Math.min(Math.max(Math.round(track.scrollLeft / width), 0), total - 1);
}

export default function VillaDetailGallery({
  villaId,
  name,
  images,
}: VillaDetailGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [mobileSlide, setMobileSlide] = useState(0);
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const lightboxTrackRef = useRef<HTMLDivElement | null>(null);
  const lightboxIndexRef = useRef<number | null>(null);
  const pendingLightboxIndex = useRef<number | null>(null);
  const galleryTouchX = useRef<number | null>(null);
  const gallerySwiped = useRef(false);
  const total = images.length;
  const main = images[0];
  const side = images.slice(1, 5);

  lightboxIndexRef.current = lightboxIndex;

  const close = useCallback(() => {
    pendingLightboxIndex.current = null;
    setLightboxIndex(null);
  }, []);

  const openLightbox = useCallback((index: number) => {
    pendingLightboxIndex.current = index;
    setLightboxIndex(index);
  }, []);

  const scrollLightboxTo = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const track = lightboxTrackRef.current;
      if (!track || total <= 0) return;
      const next = ((index % total) + total) % total;
      track.scrollTo({ left: next * track.clientWidth, behavior });
    },
    [total]
  );

  const stepLightbox = useCallback(
    (direction: -1 | 1) => {
      const current = lightboxIndexRef.current;
      if (current === null || total <= 1) return;
      const next = (current + direction + total) % total;
      const wraps = (current === 0 && next === total - 1) || (current === total - 1 && next === 0);
      setLightboxIndex(next);
      scrollLightboxTo(next, wraps ? "instant" : "smooth");
    },
    [scrollLightboxTo, total]
  );
  const showPrev = useCallback(() => stepLightbox(-1), [stepLightbox]);
  const showNext = useCallback(() => stepLightbox(1), [stepLightbox]);

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
    if (!track) return;
    setMobileSlide(slideIndexFromScroll(track, total));
  }, [total]);

  const handleLightboxScroll = useCallback(() => {
    if (pendingLightboxIndex.current !== null) return;
    const track = lightboxTrackRef.current;
    if (!track) return;
    setLightboxIndex(slideIndexFromScroll(track, total));
  }, [total]);

  useLayoutEffect(() => {
    if (lightboxIndex === null) {
      pendingLightboxIndex.current = null;
      return;
    }
    const pending = pendingLightboxIndex.current;
    if (pending === null) return;

    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      const track = lightboxTrackRef.current;
      if (!track || track.clientWidth === 0) {
        window.requestAnimationFrame(apply);
        return;
      }
      track.scrollLeft = pending * track.clientWidth;
      pendingLightboxIndex.current = null;
    };
    apply();
    return () => {
      cancelled = true;
    };
  }, [lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
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
      {/* Mobil: native snap kaydırma — button slayt iOS'ta kaydırmayı kilitler */}
      <div className="relative sm:hidden">
        <div
          ref={mobileTrackRef}
          onScroll={handleMobileScroll}
          onTouchStart={(event) => {
            galleryTouchX.current = event.changedTouches[0]?.clientX ?? null;
            gallerySwiped.current = false;
          }}
          onTouchMove={(event) => {
            const startX = galleryTouchX.current;
            const currentX = event.changedTouches[0]?.clientX;
            if (startX === null || currentX === undefined) return;
            if (Math.abs(currentX - startX) > 12) gallerySwiped.current = true;
          }}
          className="flex touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, index) => {
            const shouldLoad = Math.abs(index - mobileSlide) <= 1 || index <= 1;
            return (
              <div
                key={`mobile-${src}-${index}`}
                role="button"
                tabIndex={0}
                aria-label={`${name} fotoğraf ${index + 1}`}
                onClick={() => {
                  if (gallerySwiped.current) return;
                  openLightbox(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openLightbox(index);
                  }
                }}
                className="relative aspect-[16/10] w-full min-w-full shrink-0 snap-start overflow-hidden bg-slate-200"
              >
                {shouldLoad ? (
                  <GalleryImage
                    src={src}
                    alt={`${name} ${index + 1}`}
                    fill
                    priority={index === 0}
                    draggable={false}
                    className="pointer-events-none object-cover"
                    sizes="100vw"
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {actionButtons}

        {total > 1 ? (
          <>
            <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
              {mobileSlide + 1} / {total}
            </p>
            <button
              type="button"
              onClick={() => openLightbox(mobileSlide)}
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
          onClick={() => openLightbox(0)}
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
            onClick={() => openLightbox(index + 1)}
            className="relative aspect-[4/3] cursor-pointer overflow-hidden"
          >
            <GalleryImage
              src={src}
              alt={`${name} ${index + 2}`}
              fill
              loading="lazy"
              className="object-cover transition duration-300 hover:scale-[1.03]"
              sizes="25vw"
            />
          </button>
        ))}

        {actionButtons}

        {total > 1 && (
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-md backdrop-blur hover:bg-white"
          >
            <Images className="h-4 w-4" />
            Tümünü Göster
          </button>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[80] bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Villa galerisi"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Kapat"
          >
            <X className="h-6 w-6" />
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={showPrev}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
                aria-label="Önceki"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={showNext}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
                aria-label="Sonraki"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}
          <div
            ref={lightboxTrackRef}
            onScroll={handleLightboxScroll}
            className="flex h-full w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((src, index) => {
              const active = lightboxIndex;
              const shouldLoad = Math.abs(index - active) <= 2;
              return (
                <div
                  key={`lightbox-${src}-${index}`}
                  className="relative flex h-full w-full min-w-full shrink-0 snap-start items-center justify-center px-12 py-16"
                >
                  {shouldLoad ? (
                    <div className="pointer-events-none relative h-[75vh] w-full max-w-5xl">
                      <GalleryImage
                        src={src}
                        alt={`${name} ${index + 1}`}
                        fill
                        priority={index === active}
                        draggable={false}
                        className="object-contain"
                        sizes="100vw"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {lightboxIndex + 1} / {total}
          </p>
        </div>
      )}
    </>
  );
}
