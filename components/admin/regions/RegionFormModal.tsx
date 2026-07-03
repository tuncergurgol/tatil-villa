"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Save, Trash2, UploadCloud, X } from "lucide-react";
import { uploadCompanyAsset } from "@/app/actions/admin/company-assets";
import {
  createRegion,
  updateRegion,
  type RegionActionState,
} from "@/app/actions/admin/regions";
import type { RegionFlat } from "@/lib/regions-tree";

interface RegionFormModalProps {
  regions: RegionFlat[];
  region?: RegionFlat;
  defaultParentId?: string | null;
  onClose: () => void;
}

const initialState: RegionActionState = {};

function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function TextareaField({
  label,
  name,
  defaultValue = "",
  rows = 3,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function ToggleField({
  label,
  name,
  checked,
  onChange,
  className = "",
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 ${className}`}
    >
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-indigo-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
    </label>
  );
}

export default function RegionFormModal({
  regions,
  region,
  defaultParentId,
  onClose,
}: RegionFormModalProps) {
  const isEdit = !!region;
  const action = isEdit
    ? updateRegion.bind(null, region.id)
    : createRegion;

  const [state, formAction, pending] = useActionState(action, initialState);
  const [imageUrl, setImageUrl] = useState(region?.image ?? "");
  const [published, setPublished] = useState(region?.published ?? true);
  const [showInSearch, setShowInSearch] = useState(region?.showInSearch ?? false);
  const [showInOffer, setShowInOffer] = useState(region?.showInOffer ?? false);
  const [showOnHome, setShowOnHome] = useState(region?.showOnHome ?? false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  const excludeIds = new Set<string>();
  if (region) {
    excludeIds.add(region.id);
  }

  function handleImageUpload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", "region");

    startUpload(async () => {
      const result = await uploadCompanyAsset(formData);
      if (result.success) {
        setImageUrl(result.url);
      } else {
        setUploadError(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Bölge Düzenle" : "Yeni Bölge"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {state.error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {state.error}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Adı" name="name" defaultValue={region?.name} />
                  <label className="block">
                    <span className="text-xs font-medium text-gray-500">
                      Üst Bölgesi
                    </span>
                    <select
                      name="parentId"
                      defaultValue={region?.parentId ?? defaultParentId ?? ""}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">— Seçiniz —</option>
                      {regions
                        .filter((r) => !excludeIds.has(r.id))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <TextareaField
                  label="Açıklama"
                  name="description"
                  defaultValue={region?.description}
                  rows={3}
                />
                <TextareaField
                  label="Uzun Açıklama"
                  name="longDescription"
                  defaultValue={region?.longDescription}
                  rows={4}
                />
                <TextareaField
                  label="Seo Açıklama"
                  name="seoDescription"
                  defaultValue={region?.seoDescription}
                  rows={3}
                />
                <TextareaField
                  label="Seo Keywords"
                  name="seoKeywords"
                  defaultValue={region?.seoKeywords}
                  rows={2}
                />
                <Field
                  label="Seo Başlık"
                  name="seoTitle"
                  defaultValue={region?.seoTitle}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Sef Url"
                    name="slug"
                    defaultValue={region?.slug}
                  />
                  <Field
                    label="Öncelik"
                    name="sortOrder"
                    type="number"
                    defaultValue={String(region?.sortOrder ?? 0)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <ToggleField
                    label="Yayın Durumu"
                    name="published"
                    checked={published}
                    onChange={setPublished}
                  />
                  <ToggleField
                    label="Arama Alanında Görünür"
                    name="showInSearch"
                    checked={showInSearch}
                    onChange={setShowInSearch}
                  />
                  <ToggleField
                    label="Teklif Alanında Görünür"
                    name="showInOffer"
                    checked={showInOffer}
                    onChange={setShowInOffer}
                  />
                  <ToggleField
                    label="Anasayfada Gözüksün"
                    name="showOnHome"
                    checked={showOnHome}
                    onChange={setShowOnHome}
                    className="sm:col-span-3"
                  />
                </div>

                <input
                  type="hidden"
                  name="active"
                  value={region?.active === false ? "false" : "true"}
                />
              </div>

              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  <div className="relative aspect-square w-full">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={region?.name ?? "Bölge görseli"}
                        fill
                        className="object-cover"
                        sizes="220px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Görsel yok
                      </div>
                    )}
                  </div>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    handleImageUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <UploadCloud className="h-4 w-4" />
                  {isUploading ? "Yükleniyor..." : "Görsel Yükle"}
                </button>

                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  disabled={!imageUrl}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Resmi Sil
                </button>

                {uploadError && (
                  <p className="text-xs text-red-600">{uploadError}</p>
                )}

                <input type="hidden" name="image" value={imageUrl} required />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4">
            <button
              type="submit"
              disabled={pending || !imageUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
