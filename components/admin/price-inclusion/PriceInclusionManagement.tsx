"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CircleDollarSign,
  Pencil,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  deletePriceInclusionItem,
  togglePriceInclusionDefault,
} from "@/app/actions/admin/price-inclusion";
import PriceInclusionFormModal from "@/components/admin/price-inclusion/PriceInclusionFormModal";
import type { PriceInclusionItem } from "@/lib/queries/price-inclusion";
import { includesSearchText } from "@/lib/search-text";

interface PriceInclusionManagementProps {
  included: PriceInclusionItem[];
  excluded: PriceInclusionItem[];
  totalCount: number;
  defaultCount: number;
}

type TabKey = "all" | "INCLUDED" | "EXCLUDED";

function ItemTable({
  items,
  title,
  onEdit,
  onDelete,
  onToggleDefault,
  isPending,
}: {
  items: PriceInclusionItem[];
  title: string;
  onEdit: (item: PriceInclusionItem) => void;
  onDelete: (item: PriceInclusionItem) => void;
  onToggleDefault: (id: string) => void;
  isPending: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
        {title} için kayıt bulunamadı.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="hidden grid-cols-[72px_1fr_120px_88px] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
        <span>Sıra No</span>
        <span>Açıklama</span>
        <span className="text-center">Varsayılan</span>
        <span className="text-right">İşlem</span>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[72px_1fr_120px_88px] sm:items-center ${
              item.isDefault ? "bg-sky-50/60" : "bg-white"
            }`}
          >
            <div className="flex items-center gap-2 sm:block">
              <span className="text-xs font-medium text-gray-400 sm:hidden">
                Sıra No
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                {index + 1}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-xs font-medium text-gray-400 sm:hidden">
                Açıklama
              </span>
              <p
                className={`text-sm leading-relaxed ${
                  item.isDefault
                    ? "font-semibold text-sky-900"
                    : "font-medium text-gray-800"
                }`}
              >
                {item.description}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:justify-center">
              <span className="text-xs font-medium text-gray-400 sm:hidden">
                Varsayılan
              </span>
              <button
                type="button"
                title="Varsayılan"
                disabled={isPending}
                onClick={() => onToggleDefault(item.id)}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                  item.isDefault
                    ? "bg-sky-100 text-sky-700"
                    : "bg-gray-100 text-gray-500 hover:bg-sky-50 hover:text-sky-600"
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    item.isDefault ? "fill-sky-500 text-sky-500" : ""
                  }`}
                />
                {item.isDefault ? "Evet" : "Hayır"}
              </button>
            </div>

            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="rounded-lg border p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onDelete(item)}
                className="rounded-lg border p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PriceInclusionManagement({
  included,
  excluded,
  totalCount,
  defaultCount,
}: PriceInclusionManagementProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<
    | { mode: "create"; defaultType?: "INCLUDED" | "EXCLUDED" }
    | { mode: "edit"; item: PriceInclusionItem }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const allItems = useMemo(
    () => [...included, ...excluded],
    [included, excluded]
  );

  const filteredIncluded = useMemo(() => {
    if (!search.trim()) return included;
    return included.filter((item) =>
      includesSearchText(item.description, search)
    );
  }, [included, search]);

  const filteredExcluded = useMemo(() => {
    if (!search.trim()) return excluded;
    return excluded.filter((item) =>
      includesSearchText(item.description, search)
    );
  }, [excluded, search]);

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  function handleDelete(item: PriceInclusionItem) {
    if (!window.confirm(`"${item.description}" silinsin mi?`)) return;
    runAction(() => deletePriceInclusionItem(item.id));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-[180px] items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">
                Fiyata Dahil Olan/Olmayan
              </h1>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                {totalCount}
              </span>
            </div>
          </div>

          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Kayıt
          </button>
        </div>

        <div className="border-b border-gray-100 bg-sky-50/60 px-5 py-2 text-xs text-sky-800">
          <Star className="mr-1 inline h-3.5 w-3.5 fill-current" />
          {defaultCount} varsayılan kayıt — yeni villa eklerken otomatik seçilir
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                activeTab === "all"
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Tümü ({allItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("INCLUDED")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                activeTab === "INCLUDED"
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Fiyata Dahil ({included.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("EXCLUDED")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                activeTab === "EXCLUDED"
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Fiyata Dahil Değil ({excluded.length})
            </button>
          </div>
        </div>

        <div className="space-y-8 px-5 py-5">
          {(activeTab === "all" || activeTab === "INCLUDED") && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                  Fiyata Dahil ({filteredIncluded.length})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setModal({ mode: "create", defaultType: "INCLUDED" })
                  }
                  className="text-sm font-medium text-indigo-600"
                >
                  + Ekle
                </button>
              </div>
              <ItemTable
                items={filteredIncluded}
                title="Fiyata dahil"
                isPending={isPending}
                onEdit={(item) => setModal({ mode: "edit", item })}
                onDelete={handleDelete}
                onToggleDefault={(id) =>
                  runAction(() => togglePriceInclusionDefault(id))
                }
              />
            </section>
          )}

          {(activeTab === "all" || activeTab === "EXCLUDED") && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                  Fiyata Dahil Değil ({filteredExcluded.length})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setModal({ mode: "create", defaultType: "EXCLUDED" })
                  }
                  className="text-sm font-medium text-indigo-600"
                >
                  + Ekle
                </button>
              </div>
              <ItemTable
                items={filteredExcluded}
                title="Fiyata dahil değil"
                isPending={isPending}
                onEdit={(item) => setModal({ mode: "edit", item })}
                onDelete={handleDelete}
                onToggleDefault={(id) =>
                  runAction(() => togglePriceInclusionDefault(id))
                }
              />
            </section>
          )}
        </div>
      </div>

      {modal?.mode === "create" && (
        <PriceInclusionFormModal
          defaultType={modal.defaultType}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "edit" && (
        <PriceInclusionFormModal
          item={modal.item}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
