"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CallbackPreferredDay,
  CallbackPreferredTime,
  CallbackRequestStatus,
} from "@prisma/client";
import {
  createCallbackRequestAdmin,
  deleteCallbackRequestAndReturn,
  updateCallbackRequest,
  type CallbackRequestActionState,
} from "@/app/actions/admin/callback-requests";
import {
  CALLBACK_DAY_LABELS,
  CALLBACK_STATUS_LABELS,
  CALLBACK_TIME_LABELS,
} from "@/lib/callback-request-labels";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const LIST_HREF = "/admin/acente/sizi-arayalim";

export type CallbackRequestFormItem = {
  id: string;
  name: string;
  phone: string;
  note: string;
  preferredDay: CallbackPreferredDay;
  preferredTime: CallbackPreferredTime;
  status: CallbackRequestStatus;
  adminNote: string;
  sourceSite: string;
  sourceDomain: string;
};

interface Props {
  item?: CallbackRequestFormItem | null;
}

export default function CallbackRequestForm({ item }: Props) {
  const router = useRouter();
  const isEdit = Boolean(item);
  const action = isEdit ? updateCallbackRequest : createCallbackRequestAdmin;
  const [state, formAction, pending] = useActionState<
    CallbackRequestActionState,
    FormData
  >(action, {});

  useEffect(() => {
    if (!isEdit || !state.success) return;
    router.push(LIST_HREF);
    router.refresh();
  }, [isEdit, state.success, router]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? "Sizi Arayalım Detay" : "Manuel Geri Arama Kaydı"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Public formdan gelen veya manuel eklenen talepler
          </p>
        </div>
        <Link
          href={LIST_HREF}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Listeye dön
        </Link>
      </div>

      <form
        action={formAction}
        data-no-page-refresh
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        {isEdit ? <input type="hidden" name="id" value={item!.id} /> : null}

        {isEdit && (item?.sourceSite || item?.sourceDomain) ? (
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p className="font-semibold">Kaynak site</p>
            <p className="mt-1">
              {item?.sourceSite || "—"}
              {item?.sourceDomain ? (
                <span className="text-sky-700"> · {item.sourceDomain}</span>
              ) : null}
            </p>
          </div>
        ) : null}

        {state.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.error}
          </div>
        ) : null}

        {state.success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Kaydedildi, listeye yönlendiriliyorsunuz…
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Ad</span>
            <input
              name="name"
              required
              defaultValue={item?.name ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Telefon</span>
            <input
              name="phone"
              required
              defaultValue={item?.phone ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Tercih Gün</span>
            <select
              name="preferredDay"
              defaultValue={item?.preferredDay ?? "ANY"}
              className={inputClass}
            >
              {Object.entries(CALLBACK_DAY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Tercih Saat</span>
            <select
              name="preferredTime"
              defaultValue={item?.preferredTime ?? "ASAP"}
              className={inputClass}
            >
              {Object.entries(CALLBACK_TIME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-gray-500">
              Tatil planı / not
            </span>
            <textarea
              name="note"
              rows={3}
              defaultValue={item?.note ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Durum</span>
            <select
              name="status"
              defaultValue={item?.status ?? "VERIFIED"}
              className={inputClass}
            >
              {Object.entries(CALLBACK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-gray-500">Admin notu</span>
            <textarea
              name="adminNote"
              rows={3}
              defaultValue={item?.adminNote ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {pending
              ? isEdit
                ? "Kaydediliyor…"
                : "Oluşturuluyor…"
              : isEdit
                ? "Kaydet"
                : "Oluştur"}
          </button>
          {isEdit ? (
            <button
              type="submit"
              disabled={pending}
              formAction={deleteCallbackRequestAndReturn.bind(null, item!.id)}
              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Sil
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
