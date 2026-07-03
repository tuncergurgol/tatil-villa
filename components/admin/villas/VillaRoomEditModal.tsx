"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import {
  BedDouble,
  Camera,
  Check,
  ImageIcon,
  Info,
  Plus,
  X,
} from "lucide-react";
import type { VillaRoom } from "@prisma/client";
import { updateVillaRoom } from "@/app/actions/admin/villa-rooms";
import {
  getRoomFeatureOptions,
  ROOM_TYPE_OPTIONS,
} from "@/lib/villa-room-features";

interface VillaRoomEditModalProps {
  villaId: string;
  villaName: string;
  room: VillaRoom;
  galleryImages: string[];
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const labelClass = "text-xs font-medium text-gray-500";

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

export default function VillaRoomEditModal({
  villaId,
  villaName,
  room,
  galleryImages,
  onClose,
  onSaved,
}: VillaRoomEditModalProps) {
  const [roomType, setRoomType] = useState(room.roomType);
  const [name, setName] = useState(room.name);
  const [singleBeds, setSingleBeds] = useState(String(room.singleBeds));
  const [doubleBeds, setDoubleBeds] = useState(String(room.doubleBeds));
  const [imageUrl, setImageUrl] = useState(room.imageUrl);
  const [selectedFeatures, setSelectedFeatures] = useState(room.features);
  const [customFeatures, setCustomFeatures] = useState(room.customFeatures);
  const [newFeature, setNewFeature] = useState("");
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRoomType(room.roomType);
    setName(room.name);
    setSingleBeds(String(room.singleBeds));
    setDoubleBeds(String(room.doubleBeds));
    setImageUrl(room.imageUrl);
    setSelectedFeatures(room.features);
    setCustomFeatures(room.customFeatures);
  }, [room]);

  const featureOptions = getRoomFeatureOptions(customFeatures);

  function toggleFeature(feature: string) {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((item) => item !== feature)
        : [...prev, feature]
    );
  }

  function addCustomFeature() {
    const value = newFeature.trim();
    if (!value) return;
    if (!customFeatures.includes(value)) {
      setCustomFeatures((prev) => [...prev, value]);
    }
    if (!selectedFeatures.includes(value)) {
      setSelectedFeatures((prev) => [...prev, value]);
    }
    setNewFeature("");
  }

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.set("roomType", roomType);
    formData.set("name", name);
    formData.set("singleBeds", singleBeds);
    formData.set("doubleBeds", doubleBeds);
    formData.set("imageUrl", imageUrl);
    selectedFeatures.forEach((feature) => formData.append("features", feature));
    customFeatures.forEach((feature) =>
      formData.append("customFeatures", feature)
    );

    startTransition(async () => {
      const result = await updateVillaRoom(villaId, room.id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-gray-50 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {villaName} — Oda Yönetimi
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              title="Oda Fotoğrafı"
              icon={<Camera className="h-4 w-4 text-blue-600" />}
            >
              <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-100">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-gray-400">
                    <Camera className="mb-2 h-8 w-8" />
                    <span className="text-sm">Fotoğraf seçilmedi</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowGalleryPicker(true)}
                disabled={galleryImages.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImageIcon className="h-4 w-4" />
                Villa Galerisinden Seç
              </button>
            </SectionCard>

            <SectionCard
              title="Oda Bilgileri"
              icon={<Info className="h-4 w-4 text-amber-500" />}
            >
              <div className="space-y-4">
                <label className="block">
                  <span className={labelClass}>Oda Tipi</span>
                  <select
                    value={roomType}
                    onChange={(event) => setRoomType(event.target.value)}
                    className={`mt-1.5 ${inputClass}`}
                  >
                    {ROOM_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Oda Adı (Yönetim)</span>
                  <span className="mt-0.5 block text-[11px] text-gray-400">
                    Müşteriye gösterilmez
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={`mt-1.5 ${inputClass}`}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Tek Kişilik Yatak</span>
                    <input
                      type="number"
                      min={0}
                      value={singleBeds}
                      onChange={(event) => setSingleBeds(event.target.value)}
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Çift Kişilik Yatak</span>
                    <input
                      type="number"
                      min={0}
                      value={doubleBeds}
                      onChange={(event) => setDoubleBeds(event.target.value)}
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </label>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Oda Özellikleri"
            icon={<Check className="h-4 w-4 text-emerald-600" />}
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {featureOptions.map((feature) => {
                const selected = selectedFeatures.includes(feature);
                return (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => toggleFeature(feature)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      selected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span>{feature}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={newFeature}
                onChange={(event) => setNewFeature(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomFeature();
                  }
                }}
                placeholder="Özellik adı yazın..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomFeature}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Ekle
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Kaydediliyor..." : "Güncelle"}
          </button>
        </div>
      </div>

      {showGalleryPicker ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowGalleryPicker(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Villa Galerisinden Seç
              </h3>
              <button
                type="button"
                onClick={() => setShowGalleryPicker(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {galleryImages.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    setImageUrl(url);
                    setShowGalleryPicker(false);
                  }}
                  className={`relative aspect-[4/3] overflow-hidden rounded-xl border ${
                    imageUrl === url
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200"
                  }`}
                >
                  <Image
                    src={url}
                    alt="Galeri"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
