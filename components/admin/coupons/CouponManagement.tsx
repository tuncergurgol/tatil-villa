"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import {
  deleteAdminCouponAction,
  saveAdminCouponAction,
} from "@/app/actions/admin/coupons";
import type { AdminCouponListItem } from "@/lib/queries/admin-coupons";

type CouponFormState = {
  id?: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: string;
  minBookingMultiplier: string;
  maxDiscountAmount: string;
  usageLimit: string;
  memberOnly: boolean;
  welcomeCoupon: boolean;
  siteKey: string;
  active: boolean;
  validFrom: string;
  validTo: string;
};

const emptyForm: CouponFormState = {
  code: "",
  discountType: "FIXED",
  discountValue: "1000",
  minBookingMultiplier: "10",
  maxDiscountAmount: "",
  usageLimit: "",
  memberOnly: false,
  welcomeCoupon: false,
  siteKey: "",
  active: true,
  validFrom: "",
  validTo: "",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toISOString().slice(0, 10);
}

function toForm(coupon: AdminCouponListItem): CouponFormState {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    minBookingMultiplier: String(coupon.minBookingMultiplier),
    maxDiscountAmount:
      coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : "",
    usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
    memberOnly: coupon.memberOnly,
    welcomeCoupon: coupon.welcomeCoupon,
    siteKey: coupon.siteKey ?? "",
    active: coupon.active,
    validFrom: formatDate(coupon.validFrom),
    validTo: formatDate(coupon.validTo),
  };
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

export default function CouponManagement({
  coupons,
}: {
  coupons: AdminCouponListItem[];
}) {
  const [form, setForm] = useState<CouponFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.active),
    [coupons]
  );

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    const formData = new FormData();
    if (form.id) formData.set("id", form.id);
    formData.set("code", form.code);
    formData.set("discountType", form.discountType);
    formData.set("discountValue", form.discountValue);
    formData.set("minBookingMultiplier", form.minBookingMultiplier);
    if (form.maxDiscountAmount.trim()) {
      formData.set("maxDiscountAmount", form.maxDiscountAmount);
    }
    if (form.usageLimit.trim()) formData.set("usageLimit", form.usageLimit);
    formData.set("memberOnly", form.memberOnly ? "true" : "false");
    formData.set("welcomeCoupon", form.welcomeCoupon ? "true" : "false");
    if (form.siteKey.trim()) formData.set("siteKey", form.siteKey);
    formData.set("active", form.active ? "true" : "false");
    if (form.validFrom.trim()) formData.set("validFrom", form.validFrom);
    if (form.validTo.trim()) formData.set("validTo", form.validTo);

    startTransition(async () => {
      const result = await saveAdminCouponAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setForm(null);
    });
  }

  function handleDelete(id: string, code: string) {
    if (!window.confirm(`"${code}" kuponu silinsin mi?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAdminCouponAction(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Kupon Yönetimi</h1>
              <p className="text-sm text-gray-500">
                {activeCoupons.length} aktif / {coupons.length} toplam kupon
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForm(emptyForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Kupon
          </button>
        </div>

        {error ? (
          <p className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="grid gap-3 border-b border-gray-100 px-5 py-4 last:border-0 lg:grid-cols-[minmax(0,1fr)_120px_120px_120px_88px_72px] lg:items-center"
            >
              <div>
                <p className="font-semibold text-gray-900">{coupon.code}</p>
                <p className="text-sm text-gray-500">
                  {coupon.discountType === "PERCENT"
                    ? `%${coupon.discountValue}`
                    : `${coupon.discountValue.toLocaleString("tr-TR")} TL`}
                  {coupon.memberOnly ? " · Üyeye özel" : ""}
                  {coupon.welcomeCoupon ? " · Hoş geldin" : ""}
                </p>
              </div>
              <div className="text-sm text-gray-700">
                Kullanım: {coupon.usedCount}
                {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ""}
              </div>
              <div className="text-sm text-gray-700">
                {formatDate(coupon.validFrom)} → {formatDate(coupon.validTo)}
              </div>
              <div className="text-sm text-gray-700">
                Min. çarpan: x{coupon.minBookingMultiplier}
              </div>
              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    coupon.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {coupon.active ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setForm(toForm(coupon))}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Düzenle"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(coupon.id, coupon.code)}
                  disabled={pending}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={submitForm}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-gray-900">
              {form.id ? "Kuponu Düzenle" : "Yeni Kupon"}
            </h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Kupon Kodu
                <input
                  className={`${inputClass} mt-1.5 uppercase`}
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  İndirim Tipi
                  <select
                    className={`${inputClass} mt-1.5`}
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountType: e.target.value as "PERCENT" | "FIXED",
                      })
                    }
                  >
                    <option value="FIXED">Sabit TL</option>
                    <option value="PERCENT">Yüzde</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  İndirim Değeri
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1.5`}
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm({ ...form, discountValue: e.target.value })
                    }
                    required
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Min. Rezervasyon Çarpanı
                  <input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1.5`}
                    value={form.minBookingMultiplier}
                    onChange={(e) =>
                      setForm({ ...form, minBookingMultiplier: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Maks. İndirim (TL)
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} mt-1.5`}
                    value={form.maxDiscountAmount}
                    onChange={(e) =>
                      setForm({ ...form, maxDiscountAmount: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Kullanım Limiti
                <input
                  type="number"
                  min={1}
                  className={`${inputClass} mt-1.5`}
                  value={form.usageLimit}
                  onChange={(e) =>
                    setForm({ ...form, usageLimit: e.target.value })
                  }
                />
              </label>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.memberOnly}
                    onChange={(e) =>
                      setForm({ ...form, memberOnly: e.target.checked })
                    }
                  />
                  Yalnızca üyeler
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.welcomeCoupon}
                    onChange={(e) =>
                      setForm({ ...form, welcomeCoupon: e.target.checked })
                    }
                  />
                  Hoş geldin kuponu
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  Aktif
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Geçerlilik Başlangıcı
                  <input
                    type="date"
                    className={`${inputClass} mt-1.5`}
                    value={form.validFrom === "-" ? "" : form.validFrom}
                    onChange={(e) =>
                      setForm({ ...form, validFrom: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Geçerlilik Bitişi
                  <input
                    type="date"
                    className={`${inputClass} mt-1.5`}
                    value={form.validTo === "-" ? "" : form.validTo}
                    onChange={(e) =>
                      setForm({ ...form, validTo: e.target.value })
                    }
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
