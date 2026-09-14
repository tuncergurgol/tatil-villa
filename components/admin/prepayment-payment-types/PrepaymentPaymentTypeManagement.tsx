"use client";

import { useMemo, useState, useTransition } from "react";
import { CreditCard, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import {
  createPrepaymentPaymentType,
  deletePrepaymentPaymentType,
  restorePrepaymentPaymentType,
  updatePrepaymentPaymentType,
} from "@/app/actions/admin/prepayment-payment-types";
import type { PrepaymentPaymentTypeItem } from "@/lib/queries/prepayment-payment-types";

type StatusFilter = "active" | "passive" | "all";

interface PrepaymentPaymentTypeManagementProps {
  items: PrepaymentPaymentTypeItem[];
  totalCount: number;
  activeCount: number;
  passiveCount: number;
  embedded?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

export default function PrepaymentPaymentTypeManagement({
  items,
  totalCount,
  activeCount,
  passiveCount,
  embedded = false,
}: PrepaymentPaymentTypeManagementProps) {
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

  function handleRestore(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await restorePrepaymentPaymentType(id);
      if (result.error) setError(result.error);
    });
  }

  const emptyMessage =
    statusFilter === "active"
      ? "Aktif ödeme tipi bulunamadı."
      : statusFilter === "passive"
        ? "Pasif ödeme tipi bulunamadı."
        : "Henüz ödeme tipi tanımlanmadı.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {!embedded ? (
            <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
              Tanımlamalar
            </p>
          ) : null}
          <h1
            className={
              embedded
                ? "text-lg font-bold text-gray-900"
                : "mt-1 text-3xl font-bold text-gray-900"
            }
          >
            Ön Ödeme Ödeme Tipleri
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Rezervasyonda &apos;Ev Sahibi Ödeme&apos; sekmesinde ödeme
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

      <div className="grid gap-4 sm:grid-cols-3">
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
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-500">
              <CreditCard className="h-5 w-5" />
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
        <div className="hidden grid-cols-[72px_1fr_120px_88px] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
          <span>Sıra</span>
          <span>Ad</span>
          <span>Durum</span>
          <span className="text-right">İşlem</span>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredItems.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              {emptyMessage}
            </p>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[72px_1fr_120px_88px] sm:items-center ${
                  !item.active ? "bg-gray-50/80" : ""
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                  {index + 1}
                </span>

                {editingId === item.id ? (
                  <form action={handleUpdate} className="flex flex-wrap gap-2 sm:col-span-3">
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
                  <>
                    <p
                      className={`text-sm font-medium ${
                        item.active ? "text-gray-800" : "text-gray-500"
                      }`}
                    >
                      {item.name}
                    </p>
                    <span
                      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.active
                          ? "bg-teal-50 text-teal-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {item.active ? "Aktif" : "Pasif"}
                    </span>
                  </>
                )}

                {editingId !== item.id ? (
                  <div className="flex justify-end gap-1 sm:col-start-4">
                    {item.active ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRestore(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Aktifleştir
                      </button>
                    )}
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
