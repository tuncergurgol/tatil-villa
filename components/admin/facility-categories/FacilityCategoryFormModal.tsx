"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Save, Trash2, UploadCloud, X } from "lucide-react";
import { uploadCompanyAsset } from "@/app/actions/admin/company-assets";
import {
  createFacilityCategory,
  updateFacilityCategory,
  type FacilityCategoryActionState,
} from "@/app/actions/admin/facility-categories";
import type { FacilityCategoryItem } from "@/lib/queries/facility-categories";
import { toSurroundingSlug } from "@/lib/surrounding-utils";

interface FacilityCategoryFormModalProps {
  category?: FacilityCategoryItem;
  onClose: () => void;
}

function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="block">
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
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <label className="block">
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
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
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

export default function FacilityCategoryFormModal({
  category,
  onClose,
}: FacilityCategoryFormModalProps) {
  const isEdit = Boolean(category);
  const action = isEdit ? updateFacilityCategory : createFacilityCategory;
  const [state, formAction, pending] = useActionState<
    FacilityCategoryActionState,
    FormData
  >(action, {});
  const [imageUrl, setImageUrl] = useState(category?.image ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [published, setPublished] = useState(category?.published ?? false);
  const [showInSearch, setShowInSearch] = useState(
    category?.showInSearch ?? false
  );
  const [showInOffer, setShowInOffer] = useState(category?.showInOffer ?? false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  function handleImageUpload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", "facilityCategory");

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
            {isEdit ? "Düzenle" : "Yeni Kayıt"}
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
          {category && <input type="hidden" name="id" value={category.id} />}
          <input type="hidden" name="image" value={imageUrl} />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {state.error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {state.error}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Adı"
                    name="name"
                    defaultValue={category?.name}
                  />
                  <Field label="Tag" name="tag" defaultValue={category?.tag} />
                </div>

                <TextareaField
                  label="Açıklama"
                  name="description"
                  defaultValue={category?.description}
                  rows={3}
                />
                <TextareaField
                  label="Uzun Açıklama"
                  name="longDescription"
                  defaultValue={category?.longDescription}
                  rows={4}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextareaField
                    label="Seo Başlık"
                    name="seoTitle"
                    defaultValue={category?.seoTitle}
                    rows={2}
                  />
                  <TextareaField
                    label="Seo Keywords"
                    name="seoKeywords"
                    defaultValue={category?.seoKeywords}
                    rows={2}
                  />
                </div>

                <TextareaField
                  label="Seo Açıklama"
                  name="seoDescription"
                  defaultValue={category?.seoDescription}
                  rows={3}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-500">
                      Sef Url
                    </span>
                    <input
                      name="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          const nameInput = (
                            e.currentTarget.form?.elements.namedItem(
                              "name"
                            ) as HTMLInputElement | null
                          )?.value;
                          if (nameInput) setSlug(toSurroundingSlug(nameInput));
                        }
                      }}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  {isEdit && (
                    <div className="block">
                      <span className="text-xs font-medium text-gray-500">
                        Öncelik
                      </span>
                      <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-medium text-gray-600">
                        {(category?.sortOrder ?? 0) + 1} (alfabetik sıra)
                      </div>
                    </div>
                  )}
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
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-medium text-gray-500">Görsel</span>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  {imageUrl ? (
                    <div className="relative aspect-[3/4] w-full">
                      <Image
                        src={imageUrl}
                        alt="Kategori görseli"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center text-sm text-gray-400">
                      Görsel yok
                    </div>
                  )}
                </div>
                {uploadError && (
                  <p className="text-xs text-red-600">{uploadError}</p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <UploadCloud className="h-4 w-4" />
                  {isUploading ? "Yükleniyor..." : "Görsel Yükle"}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Görseli Kaldır
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4">
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
