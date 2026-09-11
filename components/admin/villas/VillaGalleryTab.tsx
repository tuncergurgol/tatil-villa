"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CloudDownload,
  CloudUpload,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import {
  appendVillaGalleryImages,
  deleteVillaGalleryImages,
  setVillaGalleryVitrin,
  updateVillaGalleryOrder,
} from "@/app/actions/admin/villa-gallery";
import GalleryImage from "@/components/GalleryImage";
import {
  estimateUploadBytes,
  preprocessGalleryImageFiles,
} from "@/lib/client-gallery-image-preprocess";
import { encodeGalleryImageUrl } from "@/lib/encode-gallery-image-url";
import { getNextGallerySequence } from "@/lib/villa-gallery-filename";

const UPLOAD_BATCH_SIZE = 30;
const PARALLEL_UPLOADS = 6;
const MAX_SINGLE_UPLOAD_BYTES = 42 * 1024 * 1024;

function chunkFiles<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

interface VillaGalleryTabProps {
  villaId: string;
  villaName: string;
  initialImages: string[];
}

export default function VillaGalleryTab({
  villaId,
  villaName,
  initialImages,
}: VillaGalleryTabProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initialImages);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const busy = isPending || Boolean(uploadProgress);

  async function uploadGalleryBatch(
    files: File[],
    options?: { startSequence?: number; deferPersist?: boolean }
  ): Promise<string[]> {
    const formData = new FormData();
    formData.append("villaId", villaId);
    if (options?.deferPersist) {
      formData.append("deferPersist", "true");
    }
    if (options?.startSequence != null) {
      formData.append("startSequence", String(options.startSequence));
    }
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/admin/villa-gallery/upload", {
      method: "POST",
      body: formData,
    });

    let payload: { error?: string; success?: boolean; urls?: string[] } = {};
    try {
      payload = await response.json();
    } catch {
      throw new Error(`Sunucu yanıtı okunamadı (HTTP ${response.status})`);
    }

    if (!response.ok || payload.error) {
      throw new Error(
        payload.error ?? `Yükleme başarısız (HTTP ${response.status})`
      );
    }

    return payload.urls ?? [];
  }

  const allSelected = images.length > 0 && selected.size === images.length;
  const hasSelection = selected.size > 0;

  function refresh() {
    router.refresh();
  }

  function toggleSelect(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(images));
  }

  function handleUpload() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setError("Lütfen dosya seçin");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    const fileList = Array.from(files);

    startTransition(async () => {
      try {
        setUploadProgress(`0/${fileList.length} görsel hazırlanıyor...`);
        const prepared = await preprocessGalleryImageFiles(
          fileList,
          (done, total) => {
            setUploadProgress(`${done}/${total} görsel hazırlanıyor...`);
          }
        );

        const uploadedUrls: string[] = [];
        const startSequence = getNextGallerySequence(images);
        const totalBytes = estimateUploadBytes(prepared);

        if (totalBytes <= MAX_SINGLE_UPLOAD_BYTES) {
          setUploadProgress(`${prepared.length} görsel yükleniyor...`);
          const urls = await uploadGalleryBatch(prepared, { startSequence });
          uploadedUrls.push(...urls);
        } else {
          const batches = chunkFiles(prepared, UPLOAD_BATCH_SIZE);
          let nextSequence = startSequence;
          const batchPlans = batches.map((batch) => {
            const plan = { batch, startSequence: nextSequence };
            nextSequence += batch.length;
            return plan;
          });

          for (
            let waveStart = 0;
            waveStart < batchPlans.length;
            waveStart += PARALLEL_UPLOADS
          ) {
            const wave = batchPlans.slice(waveStart, waveStart + PARALLEL_UPLOADS);
            const waveResults = await Promise.all(
              wave.map(({ batch, startSequence: batchStart }) =>
                uploadGalleryBatch(batch, {
                  startSequence: batchStart,
                  deferPersist: true,
                })
              )
            );

            for (const urls of waveResults) {
              uploadedUrls.push(...urls);
            }

            setUploadProgress(
              `${uploadedUrls.length}/${prepared.length} görsel yüklendi...`
            );
          }

          const appendResult = await appendVillaGalleryImages(
            villaId,
            uploadedUrls
          );
          if (appendResult.error) {
            throw new Error(appendResult.error);
          }
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
        setSuccessMessage(`${fileList.length} görsel yüklendi.`);
        setUploadProgress(null);
        refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Görseller yüklenirken bir sorun oluştu";
        setError(message);
        setUploadProgress(null);
      }
    });
  }

  function saveOrder(nextImages: string[]) {
    setImages(nextImages);
    startTransition(async () => {
      const result = await updateVillaGalleryOrder(villaId, nextImages);
      if (result.error) {
        setError(result.error);
        setImages(initialImages);
        return;
      }
      refresh();
    });
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    saveOrder(next);
  }

  function handleSetVitrin(url: string) {
    startTransition(async () => {
      const result = await setVillaGalleryVitrin(villaId, url);
      if (result.error) setError(result.error);
      else refresh();
    });
  }

  function handleDeleteSelected() {
    if (!hasSelection) return;
    if (!confirm(`${selected.size} görsel silinsin mi?`)) return;

    const urls = Array.from(selected);
    startTransition(async () => {
      const result = await deleteVillaGalleryImages(villaId, urls);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      refresh();
    });
  }

  function handleDeleteOne(url: string) {
    if (!confirm("Bu görsel silinsin mi?")) return;
    startTransition(async () => {
      const result = await deleteVillaGalleryImages(villaId, [url]);
      if (result.error) setError(result.error);
      else {
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(url);
          return next;
        });
        refresh();
      }
    });
  }

  function downloadGalleryUrls(urls: string[]) {
    urls.forEach((url, index) => {
      const anchor = document.createElement("a");
      anchor.href = encodeGalleryImageUrl(url);
      anchor.download =
        decodeURIComponent(url.split("/").pop() ?? "") ||
        `galeri-${index + 1}.webp`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    });
  }

  function handleDownloadSelected() {
    if (!hasSelection) return;
    downloadGalleryUrls(Array.from(selected));
  }

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold text-gray-800">
        Galeri — {villaName}
      </h2>

      {successMessage ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="max-w-xs text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <CloudUpload className="h-4 w-4" />
          {uploadProgress ?? (busy ? "Yükleniyor..." : "Yükle")}
        </button>
        {uploadProgress ? (
          <span className="text-xs font-medium text-blue-700">{uploadProgress}</span>
        ) : null}
        <span className="text-xs text-gray-500">
          JPG, PNG, WEBP — tarayıcıda küçültülür, sunucuda 100 KB altı WebP olarak
          kaydedilir
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={images.length === 0 || busy}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Tümünü Seç
          </button>
          <button
            type="button"
            onClick={handleDownloadSelected}
            disabled={!hasSelection || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloudDownload className="h-4 w-4" />
            Seçilenleri İndir
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!hasSelection || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Seçilenleri Sil
          </button>
        </div>

        {hasSelection ? (
          <p className="text-sm font-medium text-red-600">
            {selected.size} resim seçildi
          </p>
        ) : (
          <p className="text-sm text-gray-500">Sıralamak için sürükleyip bırakın</p>
        )}
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {images.map((url, index) => {
            const isSelected = selected.has(url);
            const isVitrin = index === 0;

            return (
              <div
                key={url}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => setDragIndex(null)}
                className={`group relative aspect-[4/3] overflow-hidden rounded-xl border bg-gray-100 ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200"
                } ${dragIndex === index ? "opacity-60" : ""}`}
              >
                <GalleryImage
                  src={url}
                  alt={`${villaName} ${index + 1}`}
                  fill
                  sizes="(max-width: 1280px) 20vw, 160px"
                  className="object-cover"
                  unoptimized
                />

                <label className="absolute left-2 top-2 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(url)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                  {isVitrin ? (
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-gray-900">
                      VİTRİN
                    </span>
                  ) : null}
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-2 justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleSetVitrin(url)}
                    disabled={busy || isVitrin}
                    title="Vitrin yap"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-gray-900 transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    <Star className="h-4 w-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(url)}
                    title="Büyüt"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(url)}
                    disabled={busy}
                    title="Sil"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700">
            Henüz galeri görseli yok
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Dosya seçip Yükle butonuna basarak başlayın.
          </p>
        </div>
      )}

      {previewUrl ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewUrl(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setPreviewUrl(null);
          }}
          role="presentation"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={encodeGalleryImageUrl(previewUrl)}
              alt="Galeri önizleme"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
