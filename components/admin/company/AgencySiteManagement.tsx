"use client";

import { useMemo, useState } from "react";
import { Globe, Pencil, Plus } from "lucide-react";
import AgencySiteFormModal from "@/components/admin/company/AgencySiteFormModal";
import type { AgencySiteItem } from "@/lib/queries/agency-sites";

type StatusFilter = "active" | "passive" | "all";

interface AgencySiteManagementProps {
  items: AgencySiteItem[];
  totalCount: number;
  activeCount: number;
  passiveCount: number;
  undocumentedPublishSiteKeys?: string[];
  embedded?: boolean;
}

export default function AgencySiteManagement({
  items,
  totalCount,
  activeCount,
  passiveCount,
  undocumentedPublishSiteKeys = [],
  embedded = false,
}: AgencySiteManagementProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgencySiteItem | null>(null);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return item.active;
        return !item.active;
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
      );
  }, [items, statusFilter]);

  const emptyMessage =
    statusFilter === "active"
      ? "Aktif site kaydı bulunamadı."
      : statusFilter === "passive"
        ? "Pasif site kaydı bulunamadı."
        : "Henüz site tanımlanmadı.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            className={
              embedded
                ? "text-lg font-bold text-gray-900"
                : "text-2xl font-bold text-gray-900"
            }
          >
            Acentenin Siteleri
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Rezervasyon formlarında Site Bilgisi seçenekleri ve acente site
            tanımları için kullanılır. Durum, belgesiz villa yayını ve marka
            görselleri Değiştir penceresinden yönetilir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Kayıt Ekle
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Kayıt</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-500">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pasif</p>
              <p className="text-2xl font-bold text-gray-900">{passiveCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <p className="text-sm text-gray-500">
          {filteredItems.length} kayıt listeleniyor
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Site Adı</th>
              <th className="px-4 py-3">Domain Adı</th>
              <th className="px-4 py-3">Durum</th>
              <th className="w-40 px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t border-gray-100 ${
                    !item.active ? "bg-gray-50/80" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                      <Globe className="h-4 w-4 text-teal-500" />
                      {item.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.domain}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Değiştir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <AgencySiteFormModal
          key={editingItem?.id ?? "new"}
          item={editingItem}
          undocumentedPublishSiteKeys={undocumentedPublishSiteKeys}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
        />
      ) : null}
    </div>
  );
}
