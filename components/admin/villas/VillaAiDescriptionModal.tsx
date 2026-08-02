"use client";

import { useEffect, useState, useTransition } from "react";
import type { VillaCategory } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  Loader2,
  MapPin,
  RotateCcw,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import {
  generateVillaDescriptionWithAI,
  getVillaDescriptionAiPreview,
} from "@/app/actions/admin/villa-description-ai";
import { facilityTypeLabel } from "@/lib/facility-type";
import type { VillaDescriptionPreview } from "@/lib/villa-description-generator";
import { normalizeVillaDescriptionHtml } from "@/lib/villa-html-content";

export interface VillaAiFormSnapshot {
  guests: number;
  extraCapacity: number;
  livingRooms: number;
  bedrooms: number;
  bathrooms: number;
  amenityCount: number;
  childFriendly: boolean;
  facilityType: VillaCategory;
}

interface VillaAiDescriptionModalProps {
  open: boolean;
  onClose: () => void;
  villaId: string;
  initialName: string;
  initialRegion: string;
  formSnapshot: VillaAiFormSnapshot;
  onGenerated: (description: string) => void;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100";

function readFormInt(name: string, fallback: number) {
  if (typeof document === "undefined") return fallback;
  const el = document.querySelector(
    `input[name="${name}"]`
  ) as HTMLInputElement | null;
  if (!el) return fallback;
  const parsed = parseInt(el.value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFormSelect(name: string, fallback: VillaCategory): VillaCategory {
  if (typeof document === "undefined") return fallback;
  const el = document.querySelector(
    `select[name="${name}"]`
  ) as HTMLSelectElement | null;
  return (el?.value as VillaCategory) || fallback;
}

function readFormString(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const el = document.querySelector(
    `input[name="${name}"]`
  ) as HTMLInputElement | null;
  return el?.value?.trim() || fallback;
}

function buildInput(
  villaId: string,
  name: string,
  region: string,
  extraInfo: string,
  snapshot: VillaAiFormSnapshot
) {
  return {
    villaId,
    name,
    region,
    extraInfo,
    guests: snapshot.guests,
    extraCapacity: snapshot.extraCapacity,
    livingRooms: snapshot.livingRooms,
    bedrooms: snapshot.bedrooms,
    bathrooms: snapshot.bathrooms,
    amenityCount: snapshot.amenityCount,
    childFriendly: snapshot.childFriendly,
    facilityType: snapshot.facilityType,
  };
}

export default function VillaAiDescriptionModal({
  open,
  onClose,
  villaId,
  initialName,
  initialRegion,
  formSnapshot,
  onGenerated,
}: VillaAiDescriptionModalProps) {
  const [name, setName] = useState(initialName);
  const [region, setRegion] = useState(initialRegion);
  const [extraInfo, setExtraInfo] = useState("");
  const [snapshot, setSnapshot] = useState(formSnapshot);
  const [previewData, setPreviewData] = useState<VillaDescriptionPreview | null>(
    null
  );
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(
    null
  );
  const [source, setSource] = useState<"ai" | "template" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingPreview, startPreviewTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    const nextName = readFormString("name", initialName);
    const nextSnapshot = {
      guests: readFormInt("guests", formSnapshot.guests),
      extraCapacity: readFormInt("extraCapacity", formSnapshot.extraCapacity),
      livingRooms: readFormInt("livingRooms", formSnapshot.livingRooms),
      bedrooms: readFormInt("bedrooms", formSnapshot.bedrooms),
      bathrooms: readFormInt("bathrooms", formSnapshot.bathrooms),
      amenityCount: formSnapshot.amenityCount,
      childFriendly: formSnapshot.childFriendly,
      facilityType: readFormSelect("category", formSnapshot.facilityType),
    };

    setName(nextName);
    setRegion(initialRegion);
    setSnapshot(nextSnapshot);
    setExtraInfo("");
    setGeneratedDescription(null);
    setSource(null);
    setError(null);

    startPreviewTransition(async () => {
      const result = await getVillaDescriptionAiPreview(
        buildInput(villaId, nextName, initialRegion, "", nextSnapshot)
      );
      if (result.error) {
        setError(result.error);
        setPreviewData(null);
        return;
      }
      setPreviewData(result.preview ?? null);
    });
  }, [open, initialName, initialRegion, formSnapshot, villaId]);

  if (!open) return null;

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateVillaDescriptionWithAI(
        buildInput(villaId, name, region, extraInfo, snapshot)
      );

      if (result.error || !result.description) {
        setError(result.error ?? "Açıklama oluşturulamadı");
        return;
      }

      setGeneratedDescription(result.description);
      setSource(result.source ?? "template");
      if (result.preview) setPreviewData(result.preview);
    });
  }

  function handleApply() {
    if (!generatedDescription) return;
    onGenerated(generatedDescription);
    onClose();
  }

  const capacityItems = [
    `${snapshot.guests} kişi`,
    snapshot.extraCapacity > 0 ? `+${snapshot.extraCapacity} ekstra` : null,
    snapshot.livingRooms > 0 ? `${snapshot.livingRooms} salon` : null,
    `${snapshot.bedrooms} yatak odası`,
    `${snapshot.bathrooms} banyo`,
    facilityTypeLabel(snapshot.facilityType),
  ].filter(Boolean);

  const previewHtml = generatedDescription
    ? normalizeVillaDescriptionHtml(generatedDescription)
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-bold text-gray-900">
                AI Villa Açıklaması
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Konum, öne çıkan özellikler, kapasite ve mesafelere göre SEO uyumlu
              metin oluşturur.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 overflow-y-auto border-b border-gray-100 px-6 py-5 lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Villa adı
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Bölge
                </span>
                <input
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Ek not (opsiyonel)
                </span>
                <textarea
                  value={extraInfo}
                  onChange={(event) => setExtraInfo(event.target.value)}
                  rows={3}
                  placeholder="Vurgulanmasını istediğiniz özel detaylar..."
                  className={`mt-1.5 ${inputClass} resize-y`}
                />
              </label>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Metne dahil edilecek veriler
              </p>

              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Villa verileri okunuyor...
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                      <Users className="h-4 w-4 text-violet-600" />
                      Kapasite
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {capacityItems.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                      <Star className="h-4 w-4 text-amber-500" />
                      Öne çıkan özellikler
                    </div>
                    {previewData?.featuredAmenities.length ? (
                      <div className="flex flex-wrap gap-2">
                        {previewData.featuredAmenities.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900 ring-1 ring-amber-100"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Henüz öne çıkan özellik seçilmemiş.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      Mesafeler
                    </div>
                    {previewData?.distances.length ? (
                      <ul className="space-y-1 text-xs text-gray-700">
                        {previewData.distances.slice(0, 8).map((item) => (
                          <li key={`${item.category}-${item.name}`}>
                            <span className="text-gray-500">{item.category}:</span>{" "}
                            {item.name} — {item.distanceLabel}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Kayıtlı mesafe bilgisi bulunamadı.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {previewData?.warnings.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Eksik veri uyarıları
                </div>
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {previewData.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col overflow-hidden bg-slate-50">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-800">Önizleme</h3>
                {source ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      source === "ai"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {source === "ai" ? "AI" : "Şablon"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Oluşturulan metni kontrol edip editöre uygulayın.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {generatedDescription ? (
                <div
                  className="prose prose-sm max-w-none text-gray-800 [&_p]:mb-3 [&_p]:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 text-center">
                  <Sparkles className="mb-3 h-8 w-8 text-violet-300" />
                  <p className="text-sm font-medium text-gray-700">
                    Henüz metin oluşturulmadı
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Soldaki verileri kontrol edip “Açıklama Oluştur”a basın.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-500">
            En iyi sonuç için önce Olanaklar ve Konum & Çevre sekmelerini kaydedin.
          </p>
          <div className="flex flex-wrap gap-2">
            {generatedDescription ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Yeniden Oluştur
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  <Check className="h-4 w-4" />
                  Editöre Uygula
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isPending ? "Oluşturuluyor..." : "Açıklama Oluştur"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
