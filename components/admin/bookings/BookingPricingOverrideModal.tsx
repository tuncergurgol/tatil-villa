"use client";

import { X } from "lucide-react";
import {
  formatPricingChangeValue,
  type BookingPricingChange,
} from "@/lib/booking-form-details";

type BookingPricingOverrideModalProps = {
  open: boolean;
  saving?: boolean;
  changes: BookingPricingChange[];
  canOverride: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function BookingPricingOverrideModal({
  open,
  saving = false,
  changes,
  canOverride,
  onConfirm,
  onClose,
}: BookingPricingOverrideModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">
            Onaylı Rezervasyon Tutar Değişikliği
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            Bu rezervasyon onaylanmış ve tutarları dondurulmuş durumda.
            Aşağıdaki kalemler değişecek. Onaylarsanız yeni değerler
            <strong> son onaylanan hesap</strong> olarak korunacak.
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Kalem</th>
                  <th className="w-32 px-3 py-2 text-right">Onaylanan</th>
                  <th className="w-32 px-3 py-2 text-right">Yeni</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => (
                  <tr key={change.key} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-700">{change.label}</td>
                    <td className="px-3 py-2 text-right text-gray-500 line-through">
                      {formatPricingChangeValue(change.previous)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                      {formatPricingChangeValue(change.next)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!canOverride ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              Onaylanmış rezervasyonun tutarlarını yalnızca yönetici
              değiştirebilir.
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || !canOverride}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Kaydediliyor…" : "Onayla ve Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
