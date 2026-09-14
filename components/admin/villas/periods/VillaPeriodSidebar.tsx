"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteVillaPricePeriod } from "@/app/actions/admin/villa-periods";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import {
  formatPeriodRange,
  formatPlainPrice,
  splitPeriodsByToday,
} from "@/lib/villa-period-calendar";

interface VillaPeriodSidebarProps {
  villaId: string;
  periods: VillaPricePeriodItem[];
  onEdit: (period: VillaPricePeriodItem) => void;
  onCreatePeriod?: () => void;
}

export default function VillaPeriodSidebar({
  villaId,
  periods,
  onEdit,
  onCreatePeriod,
}: VillaPeriodSidebarProps) {
  const router = useRouter();
  const [showPast, setShowPast] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { currentAndFuture, past } = useMemo(
    () => splitPeriodsByToday(periods),
    [periods]
  );

  const visiblePeriods = showPast ? past : currentAndFuture;

  function handleDelete(period: VillaPricePeriodItem) {
    if (!window.confirm("Bu periyot silinsin mi?")) return;

    startTransition(async () => {
      const result = await deleteVillaPricePeriod(villaId, period.id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-gray-50/60">
      <div className="border-b border-gray-200 bg-white px-4 py-4">
        {onCreatePeriod ? (
          <button
            type="button"
            onClick={onCreatePeriod}
            className="hidden w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 md:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Periyot Ekle Devam Et
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setShowPast((prev) => !prev)}
          className={`${onCreatePeriod ? "mt-4" : ""} inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700`}
        >
          <Clock3 className="h-4 w-4" />
          {showPast ? "Güncel Periyotlar" : "Geçmiş Periyotlar"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {visiblePeriods.length > 0 ? (
          <div className="space-y-2">
            {visiblePeriods.map((period) => (
              <article
                key={period.id}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {formatPeriodRange(period.startDate, period.endDate)}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="text-gray-600">Gecelik Fiyat</span>
                    <span className="font-bold text-blue-600">
                      {formatPlainPrice(
                        period.nightlyPrice,
                        period.nightlyPriceCurrency
                      )}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title="Değiştir"
                      onClick={() => onEdit(period)}
                      className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Sil"
                      disabled={isPending}
                      onClick={() => handleDelete(period)}
                      className="rounded-md border border-gray-200 bg-white p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            {showPast
              ? "Geçmiş periyot bulunamadı."
              : "Güncel veya gelecek periyot bulunamadı."}
          </p>
        )}
      </div>
    </aside>
  );
}
