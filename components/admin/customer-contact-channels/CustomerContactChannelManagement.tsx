"use client";

import { useMemo, useState, useTransition } from "react";
import { MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createCustomerContactChannel,
  deleteCustomerContactChannel,
  updateCustomerContactChannel,
} from "@/app/actions/admin/customer-contact-channels";
import type { CustomerContactChannelItem } from "@/lib/queries/customer-contact-channels";

interface CustomerContactChannelManagementProps {
  items: CustomerContactChannelItem[];
  embedded?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

export default function CustomerContactChannelManagement({
  items,
  embedded = false,
}: CustomerContactChannelManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeItems = useMemo(
    () =>
      items
        .filter((item) => item.active)
        .sort((a, b) =>
          a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
        ),
    [items]
  );

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCustomerContactChannel({}, formData);
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
      const result = await updateCustomerContactChannel({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" kanalı silinsin mi?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCustomerContactChannel(id);
      if (result.error) setError(result.error);
    });
  }

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
            Müşteri Ulaşım Kanalı
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Uygunluk Ara ve müşteri kayıtlarında kullanılacak ulaşım kanallarını
            tanımlayın.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setEditingId(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Kayıt
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showAdd ? (
        <form
          action={handleCreate}
          className="rounded-xl border border-violet-200 bg-violet-50/40 p-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[240px] flex-1">
              <span className="text-xs font-medium text-gray-500">Kanal Adı</span>
              <input
                name="name"
                required
                className={inputClass}
                placeholder="Örn. Teklif İste"
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Kanal Adı</th>
              <th className="w-48 px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {activeItems.length > 0 ? (
              activeItems.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className="border-t border-gray-100 bg-violet-50/30">
                    <td className="px-4 py-3" colSpan={2}>
                      <form
                        action={handleUpdate}
                        className="flex flex-wrap items-end gap-3"
                      >
                        <input type="hidden" name="id" value={item.id} />
                        <label className="min-w-[240px] flex-1">
                          <input
                            name="name"
                            required
                            defaultValue={item.name}
                            className={inputClass}
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                          Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"
                        >
                          İptal
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                        <MessageCircle className="h-4 w-4 text-violet-500" />
                        {item.name}
                      </span>
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
                  colSpan={2}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  Henüz ulaşım kanalı tanımlanmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
