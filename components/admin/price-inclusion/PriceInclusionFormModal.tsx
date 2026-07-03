"use client";

import { useActionState, useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import {
  createPriceInclusionItem,
  updatePriceInclusionItem,
  type PriceInclusionActionState,
} from "@/app/actions/admin/price-inclusion";
import type { PriceInclusionItem } from "@/lib/queries/price-inclusion";

interface PriceInclusionFormModalProps {
  item?: PriceInclusionItem;
  defaultType?: "INCLUDED" | "EXCLUDED";
  onClose: () => void;
}

export default function PriceInclusionFormModal({
  item,
  defaultType = "INCLUDED",
  onClose,
}: PriceInclusionFormModalProps) {
  const isEdit = Boolean(item);
  const action = isEdit ? updatePriceInclusionItem : createPriceInclusionItem;
  const [isDefault, setIsDefault] = useState(item?.isDefault ?? false);
  const [state, formAction, pending] = useActionState<
    PriceInclusionActionState,
    FormData
  >(action, {});

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Kayıt Düzenle" : "Yeni Kayıt"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-6">
          {item && <input type="hidden" name="id" value={item.id} />}
          <input
            type="hidden"
            name="isDefault"
            value={isDefault ? "true" : "false"}
          />

          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Açıklama</span>
            <textarea
              name="description"
              defaultValue={item?.description}
              required
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Tür</span>
            <select
              name="type"
              defaultValue={item?.type ?? defaultType}
              required
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="INCLUDED">Fiyata Dahil</option>
              <option value="EXCLUDED">Fiyata Dahil Değil</option>
            </select>
          </label>

          <label className="block cursor-pointer rounded-xl border-2 border-sky-200 bg-sky-50 p-4 transition hover:bg-sky-100/70">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-white p-2 text-sky-600 shadow-sm">
                <Star className="h-4 w-4 fill-current" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sky-900">Varsayılan</p>
                <p className="mt-1 text-sm text-sky-700">
                  Yeni villa eklenirken bu kayıt otomatik seçili gelir.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
              />
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2.5 text-sm"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
