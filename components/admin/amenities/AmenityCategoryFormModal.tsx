"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import {
  createAmenityCategory,
  updateAmenityCategory,
  type AmenityActionState,
} from "@/app/actions/admin/amenities";
import type { AmenityCategoryItem } from "@/lib/queries/amenities";
import { useRefreshOnActionSuccess } from "@/components/admin/AdminPageRefresh";

interface AmenityCategoryFormModalProps {
  category?: AmenityCategoryItem;
  onClose: () => void;
}

export default function AmenityCategoryFormModal({
  category,
  onClose,
}: AmenityCategoryFormModalProps) {
  const isEdit = Boolean(category);
  const action = isEdit ? updateAmenityCategory : createAmenityCategory;
  const [state, formAction, pending] = useActionState<
    AmenityActionState,
    FormData
  >(action, {});

  useRefreshOnActionSuccess(state.success);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Kategoriyi Düzenle" : "Yeni Kategori"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-6">
          {category && <input type="hidden" name="id" value={category.id} />}
          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          )}
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Kategori Adı</span>
            <input
              name="name"
              defaultValue={category?.name}
              required
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">İptal</button>
            <button type="submit" disabled={pending} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
