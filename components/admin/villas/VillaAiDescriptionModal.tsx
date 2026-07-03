"use client";

import { useEffect, useState, useTransition } from "react";
import type { VillaCategory } from "@prisma/client";
import { Loader2, Sparkles, X } from "lucide-react";
import { generateVillaDescriptionWithAI } from "@/app/actions/admin/villa-description-ai";
import { facilityTypeLabel } from "@/lib/facility-type";

export interface VillaAiFormSnapshot {
  guests: number;
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
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100";

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(readFormString("name", initialName));
    setRegion(initialRegion);
    setSnapshot({
      guests: readFormInt("guests", formSnapshot.guests),
      livingRooms: readFormInt("livingRooms", formSnapshot.livingRooms),
      bedrooms: readFormInt("bedrooms", formSnapshot.bedrooms),
      bathrooms: readFormInt("bathrooms", formSnapshot.bathrooms),
      amenityCount: formSnapshot.amenityCount,
      childFriendly: formSnapshot.childFriendly,
      facilityType: readFormSelect("category", formSnapshot.facilityType),
    });
    setError(null);
  }, [open, initialName, initialRegion, formSnapshot]);

  if (!open) return null;

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateVillaDescriptionWithAI({
        villaId,
        name,
        region,
        extraInfo,
        guests: snapshot.guests,
        livingRooms: snapshot.livingRooms,
        bedrooms: snapshot.bedrooms,
        bathrooms: snapshot.bathrooms,
        amenityCount: snapshot.amenityCount,
        childFriendly: snapshot.childFriendly,
        facilityType: snapshot.facilityType,
      });

      if (result.error || !result.description) {
        setError(result.error ?? "Açıklama oluşturulamadı");
        return;
      }

      onGenerated(result.description);
      onClose();
    });
  }

  const formItems = [
    `${snapshot.guests} Kişi`,
    snapshot.livingRooms > 0 ? `${snapshot.livingRooms} Salon` : null,
    `${snapshot.bedrooms} Yatak Odası`,
    `${snapshot.bathrooms} Banyo`,
    `${snapshot.amenityCount} Olanak`,
    snapshot.childFriendly ? "Çocuk Dostu" : null,
    facilityTypeLabel(snapshot.facilityType),
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-gradient-to-b from-violet-50 to-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-violet-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-bold text-gray-900">
                AI Villa Açıklama Oluşturucu
              </h2>
            </div>
            <p className="mt-1 text-sm text-violet-600">
              SEO Uyumlu • Yapay Zeka Destekli
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-800">
              Villa Meta Verileri
            </h3>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Villa Adı</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Bölge</span>
                <input
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500">
                  Ek Bilgi (opsiyonel)
                </span>
                <textarea
                  value={extraInfo}
                  onChange={(event) => setExtraInfo(event.target.value)}
                  rows={4}
                  placeholder="Öne çıkarmak istediğiniz özellikler, konum detayları, özel notlar..."
                  className={`mt-1.5 ${inputClass} resize-y`}
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-violet-100 bg-white/80 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Formdan alınan
            </p>
            <div className="flex flex-wrap gap-2">
              {formItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="border-t border-violet-100 px-6 py-5">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isPending ? "Oluşturuluyor..." : "Açıklama Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
