"use client";

import { useActionState, useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import {
  createCustomer,
  updateCustomer,
  type CustomerActionState,
} from "@/app/actions/admin/customers";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";
import type { CustomerListItem } from "@/lib/queries/customers";

type ContactChannelOption = {
  id: string;
  name: string;
};

interface CustomerFormModalProps {
  customer?: CustomerListItem;
  contactChannels: ContactChannelOption[];
  onClose: () => void;
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100";

export default function CustomerFormModal({
  customer,
  contactChannels,
  onClose,
}: CustomerFormModalProps) {
  const isEdit = Boolean(customer);
  const action = isEdit ? updateCustomer : createCustomer;
  const [active, setActive] = useState(customer?.active ?? true);
  const [state, formAction, pending] = useActionState<
    CustomerActionState,
    FormData
  >(action, {});

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Müşteri Düzenle" : "Yeni Müşteri"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-6">
          {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
          <input type="hidden" name="active" value={active ? "true" : "false"} />

          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          ) : null}

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Ad Soyad</span>
            <input
              name="fullName"
              defaultValue={customer?.fullName}
              required
              className={inputClass}
            />
          </label>

          <TurkishPhoneField
            name="phone"
            defaultValue={customer?.phone ?? ""}
            placeholder="5xx xxx xx xx"
          />

          <label className="block">
            <span className="text-xs font-medium text-gray-500">E-posta</span>
            <input
              name="email"
              type="email"
              defaultValue={customer?.email}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">
              Ulaşım Kanalı
            </span>
            <select
              name="contactChannelId"
              defaultValue={customer?.contactChannelId ?? ""}
              className={inputClass}
            >
              <option value="">Seçiniz</option>
              {contactChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Durum</p>
              <p className="text-xs text-gray-500">
                Pasif müşteriler listede filtrelenebilir.
              </p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2.5 text-sm"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
