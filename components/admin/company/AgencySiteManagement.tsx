"use client";

import { useMemo, useState, useTransition } from "react";
import { Globe, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createAgencySite,
  deleteAgencySite,
  setAgencySiteActive,
  updateAgencySite,
} from "@/app/actions/admin/agency-sites";
import type { AgencySiteItem } from "@/lib/queries/agency-sites";

type StatusFilter = "active" | "passive" | "all";

interface AgencySiteManagementProps {
  items: AgencySiteItem[];
  totalCount: number;
  activeCount: number;
  passiveCount: number;
  embedded?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

function SiteFields({
  item,
  submitLabel,
  onCancel,
  isPending,
  action,
}: {
  item?: AgencySiteItem;
  submitLabel: string;
  onCancel?: () => void;
  isPending: boolean;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <label className="min-w-[200px] flex-1">
        <span className="mb-1 block text-xs font-medium text-gray-500">
          Site Adı
        </span>
        <input
          name="name"
          required
          defaultValue={item?.name ?? ""}
          className={inputClass}
          placeholder="Örn. TATİL VİLLACISI"
        />
      </label>
      <label className="min-w-[220px] flex-[1.2]">
        <span className="mb-1 block text-xs font-medium text-gray-500">
          Domain Adı
        </span>
        <input
          name="domain"
          required
          defaultValue={item?.domain ?? ""}
          className={inputClass}
          placeholder="ornek.com"
        />
      </label>
      <div className="flex shrink-0 gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function AgencySiteManagement({
  items,
  totalCount,
  activeCount,
  passiveCount,
  embedded = false,
}: AgencySiteManagementProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAgencySite({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowAdd(false);
    });
  }

  function handleUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateAgencySite({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" sitesi kalıcı olarak silinsin mi?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteAgencySite(id);
      if (result.error) setError(result.error);
    });
  }

  function handleActiveChange(id: string, active: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setAgencySiteActive(id, active);
      if (result.error) setError(result.error);
    });
  }

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
            tanımları için kullanılır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setEditingId(null);
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

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showAdd ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Yeni Site Kaydı</h3>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-lg p-1 text-gray-500 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SiteFields
            submitLabel="Kaydet"
            isPending={isPending}
            action={handleCreate}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Site Adı</th>
              <th className="px-4 py-3">Domain Adı</th>
              <th className="px-4 py-3">Durum</th>
              <th className="w-52 px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className="border-t border-gray-100 bg-teal-50/30">
                    <td className="px-4 py-3" colSpan={4}>
                      <SiteFields
                        item={item}
                        submitLabel="Güncelle"
                        isPending={isPending}
                        action={handleUpdate}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
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
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600">
                          {item.active ? "Aktif" : "Pasif"}
                        </span>
                        <input
                          type="checkbox"
                          checked={item.active}
                          onChange={(event) =>
                            handleActiveChange(item.id, event.target.checked)
                          }
                          disabled={isPending}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setShowAdd(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Değiştir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
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
    </div>
  );
}
