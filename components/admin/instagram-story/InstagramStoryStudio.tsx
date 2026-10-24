"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Clapperboard,
  Download,
  Film,
  ImageIcon,
  LayoutGrid,
  Loader2,
  MapPin,
  Music2,
  Search,
  Sparkles,
  Home,
  X,
} from "lucide-react";
import {
  generateInstagramStoryStillsAction,
  getInstagramStoryCategoryAction,
  getInstagramStoryRegionAction,
  getInstagramStoryVillaAction,
} from "@/app/actions/admin/instagram-story";
import type { InstagramStorySiteOption } from "@/lib/instagram-story/types";
import {
  INSTAGRAM_STORY_TAGLINES,
  type InstagramStoryMode,
  type InstagramStorySearchHit,
  type InstagramStorySlideResult,
  type InstagramStorySourcePayload,
} from "@/lib/instagram-story/types";

type Props = {
  sites: InstagramStorySiteOption[];
};

const MODE_OPTIONS: Array<{
  id: InstagramStoryMode;
  label: string;
  hint: string;
  icon: typeof Home;
}> = [
  {
    id: "villa",
    label: "Tesis / Villa",
    hint: "Tek tesise özel story",
    icon: Home,
  },
  {
    id: "category",
    label: "Kategori",
    hint: "Örn. Isıtmalı Havuzlu — kolaj",
    icon: LayoutGrid,
  },
  {
    id: "region",
    label: "Bölge",
    hint: "Bölgedeki tesislerden kolaj",
    icon: MapPin,
  },
];

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

function searchPlaceholder(mode: InstagramStoryMode) {
  if (mode === "category") return "Kategori ara (Isıtmalı Havuzlu, Deniz Manzaralı…)";
  if (mode === "region") return "Bölge ara (Kaş, Fethiye, Antalya…)";
  return "Villa / tesis adı veya slug ara...";
}

function emptyStateCopy(mode: InstagramStoryMode) {
  if (mode === "category") {
    return {
      title: "Bir kategori seçerek başlayın",
      body: "Seçilen kategorideki tesis görsellerinden kolaj story üretilir (4’lü gruplar).",
    };
  }
  if (mode === "region") {
    return {
      title: "Bir bölge arayarak başlayın",
      body: "Bölgedeki tesis görsellerinden kolaj story üretilir (4’lü gruplar).",
    };
  }
  return {
    title: "Site seçip bir villa arayarak başlayın",
    body: "En fazla 8 görsel; videoya kendi müziğinizi ekleyebilirsiniz.",
  };
}

export default function InstagramStoryStudio({ sites }: Props) {
  const defaultSite = sites[0]!;
  const [mode, setMode] = useState<InstagramStoryMode>("villa");
  const [siteKey, setSiteKey] = useState(defaultSite.key);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [hits, setHits] = useState<InstagramStorySearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [source, setSource] = useState<InstagramStorySourcePayload | null>(
    null
  );
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [tagline, setTagline] = useState<string>(INSTAGRAM_STORY_TAGLINES[0]);
  const [meta, setMeta] = useState("");
  const [location, setLocation] = useState("");
  const [ctaLabel, setCtaLabel] = useState(defaultSite.ctaLabel);
  const [secondsPerSlide, setSecondsPerSlide] = useState(3);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.35);
  const [slides, setSlides] = useState<InstagramStorySlideResult[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [videoPending, setVideoPending] = useState(false);

  const selectedSite =
    sites.find((site) => site.key === siteKey) ?? defaultSite;
  const maxImages = mode === "villa" ? 8 : 24;
  const isCollageMode = mode !== "villa";
  const emptyCopy = emptyStateCopy(mode);

  useEffect(() => {
    const query = search.trim();
    if (mode === "region" && !query) {
      setHits([]);
      setSearchLoading(false);
      return;
    }
    if (mode === "villa" && !query) {
      setHits([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/instagram-story/search?mode=${encodeURIComponent(mode)}&q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setHits([]);
          return;
        }
        const data = (await response.json()) as {
          hits?: InstagramStorySearchHit[];
          villas?: InstagramStorySearchHit[];
        };
        setHits(data.hits ?? data.villas ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setHits([]);
      } finally {
        setSearchLoading(false);
      }
    }, mode === "category" && !query ? 0 : 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, mode]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const canGenerate = Boolean(source && selectedImages.length > 0);

  const selectedCountLabel = useMemo(() => {
    const available = Math.min(source?.images.length ?? 0, maxImages);
    const collageHint =
      isCollageMode && selectedImages.length > 0
        ? ` · ${Math.ceil(selectedImages.length / 4)} kolaj slayt`
        : "";
    return `${selectedImages.length} / ${available} seçili${collageHint}`;
  }, [selectedImages.length, source?.images.length, maxImages, isCollageMode]);

  function clearVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoName("");
  }

  function resetSourceState() {
    setSource(null);
    setSelectedImages([]);
    setSlides([]);
    clearVideo();
    setError(null);
  }

  function applyMode(next: InstagramStoryMode) {
    if (next === mode) return;
    setMode(next);
    setSearch("");
    setHits([]);
    setSearchFocused(false);
    resetSourceState();
    if (next === "category") {
      setTagline("KATEGORİ SEÇKİSİ");
    } else if (next === "region") {
      setTagline("BÖLGE SEÇKİSİ");
    } else {
      setTagline(INSTAGRAM_STORY_TAGLINES[0]);
    }
  }

  function applySite(nextKey: string) {
    const next = sites.find((site) => site.key === nextKey) ?? defaultSite;
    setSiteKey(next.key);
    setCtaLabel(next.ctaLabel);
    setSlides([]);
    clearVideo();
  }

  function applySource(next: InstagramStorySourcePayload) {
    setSource(next);
    const defaultCount = next.mode === "villa" ? 4 : Math.min(8, next.images.length);
    setSelectedImages(next.images.slice(0, defaultCount));
    setTagline(next.defaultTagline);
    setMeta(next.defaultMeta);
    setLocation(next.location);
    setCtaLabel(selectedSite.ctaLabel);
  }

  function selectHit(hit: InstagramStorySearchHit) {
    setError(null);
    setSearch("");
    setHits([]);
    setSlides([]);
    clearVideo();
    startTransition(async () => {
      if (mode === "villa") {
        const result = await getInstagramStoryVillaAction(hit.id);
        if ("error" in result && result.error) {
          setError(result.error);
          return;
        }
        if (!("source" in result) || !result.source) {
          setError("Villa yüklenemedi");
          return;
        }
        applySource(result.source);
        return;
      }

      if (mode === "category") {
        const result = await getInstagramStoryCategoryAction(hit.id);
        if ("error" in result && result.error) {
          setError(result.error);
          return;
        }
        if (!result.source) {
          setError("Kategori yüklenemedi");
          return;
        }
        if (result.source.images.length === 0) {
          setError("Bu kategoride görseli olan aktif tesis yok");
          return;
        }
        applySource(result.source);
        return;
      }

      const result = await getInstagramStoryRegionAction(hit.id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (!result.source) {
        setError("Bölge yüklenemedi");
        return;
      }
      if (result.source.images.length === 0) {
        setError("Bu bölgede görseli olan aktif tesis yok");
        return;
      }
      applySource(result.source);
    });
  }

  function toggleImage(url: string) {
    setSlides([]);
    clearVideo();
    setSelectedImages((current) => {
      if (current.includes(url)) {
        return current.filter((item) => item !== url);
      }
      if (current.length >= maxImages) return current;
      return [...current, url];
    });
  }

  function buildGeneratePayload() {
    if (!source) return null;
    return {
      mode,
      villaId: source.mode === "villa" ? source.id : undefined,
      categoryId: source.mode === "category" ? source.id : undefined,
      regionId: source.mode === "region" ? source.id : undefined,
      imageUrls: selectedImages,
      siteKey: selectedSite.key as
        | "tatildeyiz"
        | "balayi-villacisi"
        | "tatil-villacisi"
        | "glamping-turkey",
      tagline,
      meta,
      location,
      ctaLabel,
    };
  }

  function handleGenerateStills() {
    const payload = buildGeneratePayload();
    if (!payload) return;
    setError(null);
    clearVideo();
    startTransition(async () => {
      const result = await generateInstagramStoryStillsAction(payload);
      if ("error" in result && result.error) {
        setError(result.error);
        setSlides([]);
        return;
      }
      setSlides(result.slides ?? []);
    });
  }

  async function handleGenerateVideo() {
    const payload = buildGeneratePayload();
    if (!payload || !source) return;
    setError(null);
    setVideoPending(true);
    clearVideo();
    try {
      const form = new FormData();
      form.set("mode", payload.mode);
      if (payload.villaId) form.set("villaId", payload.villaId);
      if (payload.categoryId) form.set("categoryId", payload.categoryId);
      if (payload.regionId) form.set("regionId", payload.regionId);
      form.set("imageUrls", JSON.stringify(payload.imageUrls));
      form.set("siteKey", payload.siteKey);
      form.set("tagline", tagline);
      form.set("meta", meta);
      form.set("location", location);
      form.set("ctaLabel", ctaLabel);
      form.set("secondsPerSlide", String(secondsPerSlide));
      form.set("musicVolume", String(musicVolume));
      if (musicFile) form.set("music", musicFile);

      const response = await fetch("/api/admin/instagram-story/video", {
        method: "POST",
        body: form,
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
      const fallback =
        mode === "villa"
          ? `${source.slug}-instagram-story.mp4`
          : `${source.slug}-instagram-kolaj.mp4`;
      const name = match?.[1] || fallback;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video üretilemedi");
    } finally {
      setVideoPending(false);
    }
  }

  const showSearchDropdown =
    searchFocused &&
    (mode === "category" || Boolean(search.trim()) || searchLoading);

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
              Tesis, kategori veya bölgeye göre 1080×1920 story görseli / MP4
              videosu üretin. Kategori ve bölgede içerik kolaj olarak hazırlanır.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => applyMode(option.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${active ? "text-teal-700" : "text-gray-500"}`}
                  />
                  <span
                    className={`text-sm font-semibold ${active ? "text-teal-900" : "text-gray-800"}`}
                  >
                    {option.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{option.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Site</span>
            <select
              value={selectedSite.key}
              onChange={(event) => applySite(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            >
              {sites.map((site) => (
                <option key={site.key} value={site.key}>
                  {site.label} ({site.ctaLabel})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <div className="relative h-12 w-28 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {selectedSite.logoUrl ? (
                <Image
                  src={selectedSite.logoUrl}
                  alt={selectedSite.label}
                  fill
                  className="object-contain p-1.5"
                  unoptimized
                />
              ) : null}
            </div>
            <p className="pb-2 text-xs text-gray-500">
              Logo ve CTA bu siteye göre ayarlanır.
            </p>
          </div>
        </div>

        <div className="relative mt-5 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setSearchFocused(false), 150);
            }}
            placeholder={searchPlaceholder(mode)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
          />
          {showSearchDropdown ? (
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
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectHit(hit)}
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
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          {mode === "region" ? (
                            <MapPin className="h-5 w-5" />
                          ) : mode === "category" ? (
                            <LayoutGrid className="h-5 w-5" />
                          ) : (
                            <Home className="h-5 w-5" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {hit.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {hit.location || hit.slug}
                        {typeof hit.villaCount === "number"
                          ? ` · ${hit.villaCount} tesis`
                          : ""}
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

      {source ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                  {source.mode === "villa"
                    ? "Tesis"
                    : source.mode === "category"
                      ? "Kategori kolajı"
                      : "Bölge kolajı"}
                </p>
                <h2 className="text-lg font-semibold text-gray-900">
                  {source.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {source.location}
                  {source.villaCount > 1 ? ` · ${source.villaCount} tesis` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={resetSourceState}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <X className="h-3.5 w-3.5" />
                Temizle
              </button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">
                  {isCollageMode
                    ? "Kolaj için görseller (tesis kapakları)"
                    : "Galeri görselleri"}
                </p>
                <span className="text-xs text-gray-500">{selectedCountLabel}</span>
              </div>
              {isCollageMode ? (
                <p className="mb-3 text-xs text-gray-500">
                  Seçilen görseller 4’lü gruplar halinde kolaj slaytlara
                  dönüştürülür. En fazla {maxImages} görsel.
                </p>
              ) : null}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {source.images.slice(0, maxImages === 8 ? 24 : maxImages).map(
                  (url) => {
                    const selected = selectedImages.includes(url);
                    const order = selected
                      ? selectedImages.indexOf(url) + 1
                      : null;
                    const item = source.imageItems.find(
                      (entry) => entry.url === url
                    );
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={() => toggleImage(url)}
                        title={item?.villaName}
                        className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition ${
                          selected
                            ? "border-teal-500 ring-2 ring-teal-100"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Image
                          src={url}
                          alt={item?.villaName || ""}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        {order != null ? (
                          <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                            {order}
                          </span>
                        ) : null}
                        {isCollageMode && item?.villaName ? (
                          <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-1 text-[10px] font-medium text-white">
                            {item.villaName}
                          </span>
                        ) : null}
                      </button>
                    );
                  }
                )}
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
                  Konum / alt metin
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

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                <Music2 className="h-4 w-4 text-teal-600" />
                Video müziği (opsiyonel)
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Kendi lisanslı MP3 / M4A / WAV dosyanızı yükleyin. Video
                süresine göre kırpılır / döngüye alınır.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">
                    Müzik dosyası
                  </span>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,.mp3,.m4a,.aac,.wav,.ogg"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setMusicFile(file);
                      clearVideo();
                    }}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-700"
                  />
                  {musicFile ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMusicFile(null);
                        clearVideo();
                      }}
                      className="mt-2 text-xs font-medium text-red-600 hover:underline"
                    >
                      Müziği kaldır ({musicFile.name})
                    </button>
                  ) : null}
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">
                    Ses seviyesi ({Math.round(musicVolume * 100)}%)
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round(musicVolume * 100)}
                    onChange={(event) =>
                      setMusicVolume(Number(event.target.value) / 100)
                    }
                    className="mt-3 w-full"
                    disabled={!musicFile}
                  />
                </label>
              </div>
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
                {isCollageMode
                  ? "Kolaj story görselleri üret"
                  : "Story görselleri üret"}
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
                      .then((blob) =>
                        downloadBlob(videoName || "story.mp4", blob)
                      );
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
                Görselleri ürettiğinizde önizleme burada görünür.
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <Clapperboard className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            {emptyCopy.title}
          </p>
          <p className="mt-1 text-xs text-gray-500">{emptyCopy.body}</p>
        </div>
      )}
    </div>
  );
}
