"use client";

import { useMemo, useState, useTransition } from "react";
import { Landmark, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createCompanyBankAccount,
  deleteCompanyBankAccount,
  updateCompanyBankAccount,
} from "@/app/actions/admin/company-bank-accounts";
import {
  getCompanyPaymentTypeLabel,
  getSortedCompanyPaymentTypeOptions,
} from "@/lib/company-payment-types";
import type { CompanyBankAccountItem } from "@/lib/queries/company-bank-accounts";

interface CompanyBankAccountManagementProps {
  items: CompanyBankAccountItem[];
  embedded?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const selectClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

function BankAccountFields({
  item,
  submitLabel,
  onCancel,
  isPending,
  action,
}: {
  item?: CompanyBankAccountItem;
  submitLabel: string;
  onCancel?: () => void;
  isPending: boolean;
  action: (formData: FormData) => void;
}) {
  const paymentOptions = getSortedCompanyPaymentTypeOptions();

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <label className="min-w-[160px] flex-1">
        <span className="mb-1 block text-xs font-medium text-gray-500">
          Ödeme Türü
        </span>
        <select
          name="paymentType"
          required
          defaultValue={item?.paymentType ?? ""}
          className={selectClass}
        >
          <option value="">Seçiniz</option>
          {paymentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-[140px] flex-1">
        <span className="mb-1 block text-xs font-medium text-gray-500">
          Banka Adı
        </span>
        <input
          name="bankName"
          required
          defaultValue={item?.bankName ?? ""}
          className={inputClass}
          placeholder="Örn. KUVEYTTÜRK"
        />
      </label>
      <label className="min-w-[180px] flex-[1.5]">
        <span className="mb-1 block text-xs font-medium text-gray-500">
          Hesap Sahibi
        </span>
        <input
          name="accountHolder"
          required
          defaultValue={item?.accountHolder ?? ""}
          className={inputClass}
        />
      </label>
      <label className="min-w-[200px] flex-[1.5]">
        <span className="mb-1 block text-xs font-medium text-gray-500">
          IBAN
        </span>
        <input
          name="iban"
          required
          defaultValue={item?.iban ?? ""}
          className={inputClass}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
        />
      </label>
      <div className="flex shrink-0 gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function CompanyBankAccountManagement({
  items,
  embedded = false,
}: CompanyBankAccountManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        getCompanyPaymentTypeLabel(a.paymentType).localeCompare(
          getCompanyPaymentTypeLabel(b.paymentType),
          "tr",
          { sensitivity: "base" }
        )
      ),
    [items]
  );

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCompanyBankAccount({}, formData);
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
      const result = await updateCompanyBankAccount({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function handleDelete(id: string, label: string) {
    if (!window.confirm(`"${label}" kaydı silinsin mi?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCompanyBankAccount(id);
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
            Banka / Kasa
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Ödeme seçeneklerini tanımlayın. Her satır bir ödeme yöntemini temsil
            eder.
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

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showAdd ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
          <BankAccountFields
            submitLabel="Ekle"
            isPending={isPending}
            action={handleCreate}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Ödeme Türü</th>
              <th className="px-4 py-3">Banka Adı</th>
              <th className="px-4 py-3">Hesap Sahibi</th>
              <th className="px-4 py-3">IBAN</th>
              <th className="w-48 px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {activeItems.length > 0 ? (
              activeItems.map((item) =>
                editingId === item.id ? (
                  <tr
                    key={item.id}
                    className="border-t border-gray-100 bg-teal-50/30"
                  >
                    <td className="px-4 py-3" colSpan={5}>
                      <BankAccountFields
                        item={item}
                        submitLabel="Kaydet"
                        isPending={isPending}
                        action={handleUpdate}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                        <Landmark className="h-4 w-4 text-teal-500" />
                        {getCompanyPaymentTypeLabel(item.paymentType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.bankName}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.accountHolder}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {item.iban}
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
                          onClick={() =>
                            handleDelete(
                              item.id,
                              getCompanyPaymentTypeLabel(item.paymentType)
                            )
                          }
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
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  Henüz banka / kasa kaydı tanımlanmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
