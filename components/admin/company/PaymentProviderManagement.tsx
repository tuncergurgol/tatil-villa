"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  createPaymentProvider,
  deletePaymentProvider,
  testPaymentProviderConfig,
  updatePaymentProviderConfig,
} from "@/app/actions/admin/payment-providers";
import type {
  PaymentProviderFieldType,
  PaymentProviderItem,
} from "@/lib/queries/payment-providers";

interface PaymentProviderManagementProps {
  items: PaymentProviderItem[];
  embedded?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

let fieldRowSeq = 0;

type NewFieldRow = {
  rowId: number;
  key: string;
  label: string;
  type: PaymentProviderFieldType;
  required: boolean;
};

function createFieldRow(): NewFieldRow {
  fieldRowSeq += 1;
  return { rowId: fieldRowSeq, key: "", label: "", type: "text", required: true };
}

function NewProviderModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [rows, setRows] = useState<NewFieldRow[]>([createFieldRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRow(rowId: number, patch: Partial<NewFieldRow>) {
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row))
    );
  }

  function removeRow(rowId: number) {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  }

  function handleSubmit() {
    setError(null);
    const cleanedRows = rows
      .map((row) => ({
        key: row.key.trim(),
        label: row.label.trim(),
        type: row.type,
        required: row.required,
      }))
      .filter((row) => row.key && row.label);

    if (cleanedRows.length === 0) {
      setError("En az bir API alanı tanımlamalısınız (Key ve Label gerekli)");
      return;
    }

    const formData = new FormData();
    formData.set("slug", slug.trim().toLowerCase());
    formData.set("name", name.trim());
    if (active) formData.set("active", "on");
    formData.set("fieldsJson", JSON.stringify(cleanedRows));

    startTransition(async () => {
      const result = await createPaymentProvider({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onCreated();
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">Yeni Provider Ekle</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Teknik Ad (unique)
              </span>
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="örnek: iyzico"
                className={inputClass}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Görünen Ad
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="örnek: iyzico"
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-gray-700">Aktif</span>
          </label>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                API Alanları
              </span>
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, createFieldRow()])}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Alan Ekle
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.rowId}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-end gap-2"
                >
                  <label>
                    <span className="mb-1 block text-[11px] font-medium text-gray-500">
                      Key
                    </span>
                    <input
                      value={row.key}
                      onChange={(event) =>
                        updateRow(row.rowId, { key: event.target.value })
                      }
                      placeholder="apiKey"
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-medium text-gray-500">
                      Label
                    </span>
                    <input
                      value={row.label}
                      onChange={(event) =>
                        updateRow(row.rowId, { label: event.target.value })
                      }
                      placeholder="API Key"
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-medium text-gray-500">
                      Tip
                    </span>
                    <select
                      value={row.type}
                      onChange={(event) =>
                        updateRow(row.rowId, {
                          type: event.target.value as PaymentProviderFieldType,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="text">Text</option>
                      <option value="password">Password</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 pb-2.5">
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(event) =>
                        updateRow(row.rowId, { required: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[11px] font-medium text-gray-500">
                      Zorunlu
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRow(row.rowId)}
                    disabled={rows.length === 1}
                    className="mb-0.5 rounded-lg border border-red-200 p-2.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigureProviderModal({
  item,
  onClose,
  onSaved,
}: {
  item: PaymentProviderItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [active, setActive] = useState(item.active);
  const [isDefault, setIsDefault] = useState(item.isDefault);
  const [mode, setMode] = useState(item.mode === "live" ? "live" : "test");
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    { ok: boolean; message: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.set("id", item.id);
    if (active) formData.set("active", "on");
    if (isDefault) formData.set("isDefault", "on");
    formData.set("mode", mode);
    for (const field of item.fields) {
      const value = values[field.key];
      if (value != null) formData.set(`cred_${field.key}`, value);
    }

    startTransition(async () => {
      const result = await updatePaymentProviderConfig({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  function handleTest() {
    setError(null);
    setTestResult(null);
    setIsTesting(true);
    void testPaymentProviderConfig(item.id)
      .then((result) => setTestResult(result))
      .catch(() =>
        setTestResult({ ok: false, message: "Test sırasında hata oluştu" })
      )
      .finally(() => setIsTesting(false));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">
            Yapılandırmayı Düzenle - {item.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {testResult ? (
            <p
              className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
                testResult.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              {testResult.message}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {item.fields.map((field) => (
              <label key={field.key}>
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  {field.label}
                </span>
                <input
                  type={field.type}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={
                    field.hasValue
                      ? `Kayıtlı: ${field.maskedValue} (değiştirmek için yazın)`
                      : "Değer girin"
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs font-semibold text-gray-600">Aktif</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs font-semibold text-gray-600">
                Varsayılan
              </span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5">
              <input
                type="checkbox"
                checked={mode === "live"}
                onChange={(event) =>
                  setMode(event.target.checked ? "live" : "test")
                }
                className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-semibold text-gray-600">
                {mode === "live" ? "Canlı" : "Test"}
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Test Et
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentProviderManagement({
  items,
  embedded = false,
}: PaymentProviderManagementProps) {
  const [showNew, setShowNew] = useState(false);
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const configuringItem = items.find((item) => item.id === configuringId) ?? null;

  function handleDelete(item: PaymentProviderItem) {
    if (!window.confirm(`"${item.name}" provider'ı kalıcı olarak silinsin mi?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deletePaymentProvider(item.id);
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
            Ödeme Yönetimi
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Online ödeme sağlayıcılarını (Param, iyzico vb.) tanımlayın ve API
            bilgilerini yapılandırın.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Provider Ekle
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.slug}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    item.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.active ? "Aktif" : "Pasif"}
                </span>
                {item.isDefault ? (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                    Varsayılan
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    item.mode === "live"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.mode === "live" ? "Canlı" : "Test"}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfiguringId(item.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Yapılandır
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          Henüz ödeme sağlayıcısı tanımlanmadı.
        </div>
      )}

      {showNew ? (
        <NewProviderModal
          onClose={() => setShowNew(false)}
          onCreated={() => setShowNew(false)}
        />
      ) : null}

      {configuringItem ? (
        <ConfigureProviderModal
          item={configuringItem}
          onClose={() => setConfiguringId(null)}
          onSaved={() => setConfiguringId(null)}
        />
      ) : null}
    </div>
  );
}
