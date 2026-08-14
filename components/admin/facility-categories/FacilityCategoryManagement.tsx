"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { LayoutGrid, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteFacilityCategory } from "@/app/actions/admin/facility-categories";
import FacilityCategoryFormModal from "@/components/admin/facility-categories/FacilityCategoryFormModal";
import type { FacilityCategoryItem } from "@/lib/queries/facility-categories";
import { includesSearchText } from "@/lib/search-text";

type StatusFilter = "all" | "active" | "passive";

interface FacilityCategoryManagementProps {
  categories: FacilityCategoryItem[];
  totalCount: number;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${
        active ? "bg-teal-500" : "bg-orange-400"
      }`}
      title={active ? "Aktif" : "Pasif"}
    />
  );
}

export default function FacilityCategoryManagement({
  categories,
  totalCount,
}: FacilityCategoryManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageSize, setPageSize] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; category: FacilityCategoryItem } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesQuery =
        includesSearchText(category.name, search) ||
        includesSearchText(category.tag, search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && category.published) ||
        (statusFilter === "passive" && !category.published);

      return matchesQuery && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const visibleCategories = filteredCategories.slice(0, pageSize);

  function runDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" silinsin mi?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteFacilityCategory(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-[180px] items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Ev Kategorileri</h1>
          </div>

          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="flex rounded-xl border border-gray-200 p-1">
            {(
              [
                ["active", "Aktif"],
                ["passive", "Pasif"],
                ["all", "Tümü"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === value
                    ? "bg-teal-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
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

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="hidden grid-cols-[88px_minmax(0,1.6fr)_100px_120px_120px_88px] gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-sm font-medium text-gray-500 lg:grid">
          <div>Görsel</div>
          <div>Kategori Adı</div>
          <div className="text-center">Yayın Durum</div>
          <div className="text-center">Arama Listesinde</div>
          <div className="text-center">Teklif Listesinde</div>
          <div className="text-right">İşlem</div>
        </div>

        <div className="divide-y divide-gray-100">
          {visibleCategories.length > 0 ? (
            visibleCategories.map((category) => (
              <div
                key={category.id}
                className="grid gap-3 px-5 py-4 lg:grid-cols-[88px_minmax(0,1.6fr)_100px_120px_120px_88px] lg:items-center lg:gap-4"
              >
                <div className="flex items-center gap-3 lg:block">
                  <span className="text-xs font-medium text-gray-400 lg:hidden">
                    Görsel
                  </span>
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-gray-400">
                        webp
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-400 lg:hidden">
                    Kategori Adı
                  </span>
                  <p className="font-semibold text-gray-900">{category.name}</p>
                  {category.tag && (
                    <p className="mt-0.5 text-xs text-gray-500">{category.tag}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 lg:justify-center">
                  <span className="text-xs text-gray-400 lg:hidden">Yayın</span>
                  <StatusDot active={category.published} />
                </div>

                <div className="flex items-center gap-2 lg:justify-center">
                  <span className="text-xs text-gray-400 lg:hidden">Arama</span>
                  <StatusDot active={category.showInSearch} />
                </div>

                <div className="flex items-center gap-2 lg:justify-center">
                  <span className="text-xs text-gray-400 lg:hidden">Teklif</span>
                  <StatusDot active={category.showInOffer} />
                </div>

                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", category })}
                    className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runDelete(category.id, category.name)}
                    className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              Kayıt bulunamadı.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
          <p>
            Sayfa 1 - Toplam : {totalCount} kayıt; Gösterilen :{" "}
            {visibleCategories.length} kayıt
          </p>
          <label className="flex items-center gap-2">
            <span className="text-gray-500">Sayfa başına</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      {modal?.mode === "create" && (
        <FacilityCategoryFormModal onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <FacilityCategoryFormModal
          category={modal.category}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
