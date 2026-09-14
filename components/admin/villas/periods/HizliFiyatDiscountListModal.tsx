"use client";

import { useEffect, useState, useTransition } from "react";
import { Percent, Plus, Trash2, X } from "lucide-react";
import { deleteVillaPriceDiscount } from "@/app/actions/admin/villa-periods";
import HizliFiyatDiscountModal from "@/components/admin/villas/periods/HizliFiyatDiscountModal";
import { formatMoneyAmount } from "@/lib/villa-period-pricing";
import type { VillaPriceDiscountItem } from "@/lib/villa-price-discount";

type HizliFiyatDiscountListModalProps = {
  open: boolean;
  villaId: string;
  discounts: VillaPriceDiscountItem[];
  onClose: () => void;
  onChanged: () => void;
};

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatRate(value: number | null) {
  return value != null && value > 0 ? `%${value}` : "—";
}

export default function HizliFiyatDiscountListModal({
  open,
  villaId,
  discounts,
  onClose,
  onChanged,
}: HizliFiyatDiscountListModalProps) {
  const [items, setItems] = useState(discounts);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(discounts);
  }, [discounts]);

  if (!open) return null;

  function handleSaved(discount: VillaPriceDiscountItem) {
    setItems((current) => [
      discount,
      ...current.filter((item) => item.id !== discount.id),
    ]);
    setFormOpen(false);
    setError(null);
    onChanged();
  }

  function handleDelete(id: string) {
    if (!window.confirm("Bu indirim silinsin mi?")) return;

    startTransition(async () => {
      const result = await deleteVillaPriceDiscount(villaId, id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== id));
      setError(null);
      onChanged();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hizli-fiyat-indirim-list-title"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Percent className="h-4 w-4" />
              </span>
              <div>
                <h2
                  id="hizli-fiyat-indirim-list-title"
                  className="text-lg font-bold text-gray-900"
                >
                  İndirimler
                </h2>
                <p className="text-xs text-gray-500">
                  Bu villaya girilen indirim çalışmaları
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
            <p className="text-sm text-gray-500">
              {items.length} indirim kaydı
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              İndirim Ekle
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {error ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
                Henüz indirim yok. İndirim Ekle ile yeni çalışma tanımlayın.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Başlangıç</th>
                      <th className="px-3 py-2">Bitiş</th>
                      <th className="px-3 py-2">1. Oran</th>
                      <th className="px-3 py-2">2. Oran</th>
                      <th className="px-3 py-2">Extra Tutar</th>
                      <th className="px-3 py-2 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-3 py-2.5 font-medium text-gray-900">
                          {formatDateLabel(item.startDate)}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">
                          {formatDateLabel(item.endDate)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          {formatRate(item.discount1Rate)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          {formatRate(item.discount2Rate)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          {item.extraDiscountAmount
                            ? formatMoneyAmount(item.extraDiscountAmount)
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>

      <HizliFiyatDiscountModal
        open={formOpen}
        villaId={villaId}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
