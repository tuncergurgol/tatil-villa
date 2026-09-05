"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Clapperboard,
  Download,
  Film,
  ImageIcon,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  generateInstagramStoryStillsAction,
  getInstagramStoryVillaAction,
} from "@/app/actions/admin/instagram-story";
import {
  INSTAGRAM_STORY_TAGLINES,
  type InstagramStorySlideResult,
  type InstagramStoryVillaPayload,
} from "@/lib/instagram-story/types";

type SearchHit = {
  id: string;
  name: string;
  slug: string;
  image: string;
  location: string;
  guests: number;
  bedrooms: number;
};

function downloadBase64(fileName: string, mimeType: string, base64: string) {
  const anchor = document.createElement("a");
  anchor.href = `data:${mimeType};base64,${base64}`;
  anchor.download = fileName;
  anchor.click();
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function InstagramStoryStudio() {
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [villa, setVilla] = useState<InstagramStoryVillaPayload | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [tagline, setTagline] = useState(INSTAGRAM_STORY_TAGLINES[0]);
  const [meta, setMeta] = useState("");
  const [location, setLocation] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [secondsPerSlide, setSecondsPerSlide] = useState(3);
  const [slides, setSlides] = useState<InstagramStorySlideResult[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [videoPending, setVideoPending] = useState(false);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setHits([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/instagram-story/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setHits([]);
          return;
        }
        const data = (await response.json()) as { villas?: SearchHit[] };
        setHits(data.villas ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setHits([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const canGenerate = Boolean(villa && selectedImages.length > 0);

  const selectedCountLabel = useMemo(
    () => `${selectedImages.length} / ${Math.min(villa?.images.length ?? 0, 8)} seçili`,
    [selectedImages.length, villa?.images.length]
  );

  function clearVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoName("");
  }

  function selectVilla(hit: SearchHit) {
    setError(null);
    setSearch("");
    setHits([]);
    setSlides([]);
    clearVideo();
    startTransition(async () => {
      const result = await getInstagramStoryVillaAction(hit.id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (!("villa" in result) || !result.villa) {
        setError("Villa yüklenemedi");
        return;
      }
      const next = result.villa;
      setVilla(next);
      setSelectedImages(next.images.slice(0, 4));
      setTagline(next.defaultTagline);
      setMeta(next.defaultMeta);
      setLocation(next.location);
      setCtaLabel(next.defaultCta);
    });
  }

  function toggleImage(url: string) {
    setSlides([]);
    clearVideo();
    setSelectedImages((current) => {
      if (current.includes(url)) {
        return current.filter((item) => item !== url);
      }
      if (current.length >= 8) return current;
      return [...current, url];
    });
  }

  function handleGenerateStills() {
    if (!villa) return;
    setError(null);
    clearVideo();
    startTransition(async () => {
      const result = await generateInstagramStoryStillsAction({
        villaId: villa.id,
        imageUrls: selectedImages,
        tagline,
        meta,
        location,
        ctaLabel,
      });
      if ("error" in result && result.error) {
        setError(result.error);
        setSlides([]);
        return;
      }
      setSlides(result.slides ?? []);
    });
  }

  async function handleGenerateVideo() {
    if (!villa) return;
    setError(null);
    setVideoPending(true);
    clearVideo();
    try {
      const response = await fetch("/api/admin/instagram-story/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villaId: villa.id,
          imageUrls: selectedImages,
          tagline,
          meta,
          location,
          ctaLabel,
          secondsPerSlide,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (data?.error) throw new Error(data.error);
        if (response.status === 504 || response.status === 502) {
          throw new Error(
            "Video üretimi zaman aşımına uğradı. Daha az görsel seçin veya slayt süresini kısaltın."
          );
        }
        throw new Error(`Video üretilemedi (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const name = match?.[1] || `${villa.slug}-instagram-story.mp4`;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video üretilemedi");
    } finally {
      setVideoPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-gray-900">
              <Clapperboard className="h-5 w-5 text-teal-600" />
              <h1 className="text-xl font-bold">Instagram Story Üretici</h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Villa galerisinden görseller seçin; 1080×1920 story görselleri ve
              Ken Burns efektli MP4 videosu üretin.
            </p>
          </div>
        </div>

        <div className="relative mt-5 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Villa adı veya slug ara..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
          />
          {search.trim() ? (
            <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {searchLoading ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  Aranıyor…
                </p>
              ) : hits.length > 0 ? (
                hits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => selectVilla(hit)}
                    className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left text-sm transition last:border-b-0 hover:bg-teal-50"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      {hit.image ? (
                        <Image
                          src={hit.image}
                          alt={hit.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {hit.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {hit.location || hit.slug}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  Sonuç bulunamadı
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {villa ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {villa.name}
                </h2>
                <p className="text-sm text-gray-500">{villa.location}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVilla(null);
                  setSelectedImages([]);
                  setSlides([]);
                  clearVideo();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <X className="h-3.5 w-3.5" />
                Temizle
              </button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">
                  Galeri görselleri
                </p>
                <span className="text-xs text-gray-500">{selectedCountLabel}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {villa.images.slice(0, 24).map((url) => {
                  const selected = selectedImages.includes(url);
                  const order = selected
                    ? selectedImages.indexOf(url) + 1
                    : null;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => toggleImage(url)}
                      className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition ${
                        selected
                          ? "border-teal-500 ring-2 ring-teal-100"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {order != null ? (
                        <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                          {order}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  Üst etiket
                </span>
                <select
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                >
                  {INSTAGRAM_STORY_TAGLINES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  Konum metni
                </span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-gray-700">
                  Özellik satırı
                </span>
                <input
                  value={meta}
                  onChange={(event) => setMeta(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  CTA / domain
                </span>
                <input
                  value={ctaLabel}
                  onChange={(event) => setCtaLabel(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  Slayt süresi (sn)
                </span>
                <select
                  value={secondsPerSlide}
                  onChange={(event) =>
                    setSecondsPerSlide(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                >
                  {[2, 3, 4, 5, 6].map((value) => (
                    <option key={value} value={value}>
                      {value} saniye
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canGenerate || isPending}
                onClick={handleGenerateStills}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                Story görselleri üret
              </button>
              <button
                type="button"
                disabled={!canGenerate || videoPending || isPending}
                onClick={() => void handleGenerateVideo()}
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {videoPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Film className="h-4 w-4" />
                )}
                Story videosu üret (MP4)
              </button>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <h2 className="text-base font-semibold text-gray-900">
                Önizleme & indirme
              </h2>
            </div>

            {videoUrl ? (
              <div className="space-y-3">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="mx-auto max-h-[520px] w-auto rounded-xl border border-gray-200 bg-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!videoUrl) return;
                    void fetch(videoUrl)
                      .then((res) => res.blob())
                      .then((blob) => downloadBlob(videoName || "story.mp4", blob));
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  <Download className="h-4 w-4" />
                  MP4 indir
                </button>
              </div>
            ) : null}

            {slides.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {slides.map((slide) => (
                  <div key={slide.fileName} className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${slide.mimeType};base64,${slide.base64}`}
                      alt={slide.fileName}
                      className="w-full rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        downloadBase64(
                          slide.fileName,
                          slide.mimeType,
                          slide.base64
                        )
                      }
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      JPG indir
                    </button>
                  </div>
                ))}
              </div>
            ) : !videoUrl ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                Villa seçip görselleri ürettiğinizde önizleme burada görünür.
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <Clapperboard className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            Başlamak için bir villa arayıp seçin
          </p>
          <p className="mt-1 text-xs text-gray-500">
            En fazla 8 görsel ile story serisi ve video oluşturulabilir.
          </p>
        </div>
      )}
    </div>
  );
}
