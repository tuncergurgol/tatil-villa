"use client";

import { useState, useTransition } from "react";
import { CreditCard, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createPrepaymentPaymentType,
  deletePrepaymentPaymentType,
  updatePrepaymentPaymentType,
} from "@/app/actions/admin/prepayment-payment-types";
import type { PrepaymentPaymentTypeItem } from "@/lib/queries/prepayment-payment-types";

interface PrepaymentPaymentTypeManagementProps {
  items: PrepaymentPaymentTypeItem[];
  totalCount: number;
  activeCount: number;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

export default function PrepaymentPaymentTypeManagement({
  items,
  totalCount,
  activeCount,
}: PrepaymentPaymentTypeManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeItems = items.filter((item) => item.active);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createPrepaymentPaymentType({}, formData);
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
      const result = await updatePrepaymentPaymentType({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Bu ödeme tipi pasifleştirilecek. Devam edilsin mi?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deletePrepaymentPaymentType(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Tanımlamalar
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Ön Ödeme Ödeme Tipleri
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Rezervasyonda &apos;Tesis Sahibi Ödeme&apos; sekmesinde ödeme
            tarihi önerisi için kullanılır. Kurallar sekmesinden villa bazında
            seçilir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setEditingId(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Ekle
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Kayıt</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showAdd ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Yeni Ödeme Tipi</h2>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-lg p-1 text-gray-500 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form action={handleCreate} className="flex flex-wrap gap-3">
            <input
              name="name"
              required
              placeholder="Örn: Giriş + 1 gün"
              className={`${inputClass} min-w-[240px] flex-1`}
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Kaydet
            </button>
          </form>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="hidden grid-cols-[72px_1fr_88px] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
          <span>Sıra</span>
          <span>Ad</span>
          <span className="text-right">İşlem</span>
        </div>
        <div className="divide-y divide-gray-100">
          {activeItems.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              Henüz ödeme tipi tanımlanmadı.
            </p>
          ) : (
            activeItems.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[72px_1fr_88px] sm:items-center"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                  {index + 1}
                </span>

                {editingId === item.id ? (
                  <form action={handleUpdate} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input
                      name="name"
                      required
                      defaultValue={item.name}
                      className={`${inputClass} min-w-[200px] flex-1`}
                    />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Güncelle
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border px-4 py-2 text-sm text-gray-600"
                    >
                      İptal
                    </button>
                  </form>
                ) : (
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                )}

                {editingId !== item.id ? (
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setShowAdd(false);
                      }}
                      className="rounded-lg border p-2 text-gray-500 hover:bg-gray-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg border p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
