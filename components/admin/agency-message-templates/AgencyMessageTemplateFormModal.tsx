"use client";

import { useActionState, useEffect } from "react";
import { Save, X } from "lucide-react";
import {
  createAgencyMessageTemplate,
  updateAgencyMessageTemplate,
  type AgencyMessageTemplateActionState,
} from "@/app/actions/admin/agency-message-templates";
import { getSortedAgencyMessageRecipientOptions } from "@/lib/agency-message-recipients";
import type { AgencyMessageTemplateItem } from "@/lib/queries/agency-message-templates";
import { useRefreshOnActionSuccess } from "@/components/admin/AdminPageRefresh";

interface AgencyMessageTemplateFormModalProps {
  item?: AgencyMessageTemplateItem;
  nextRowNo?: number;
  onClose: () => void;
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

const textareaClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 min-h-[120px] resize-y";

export default function AgencyMessageTemplateFormModal({
  item,
  nextRowNo,
  onClose,
}: AgencyMessageTemplateFormModalProps) {
  const isEdit = Boolean(item);
  const action = isEdit ? updateAgencyMessageTemplate : createAgencyMessageTemplate;
  const recipientOptions = getSortedAgencyMessageRecipientOptions();
  const [state, formAction, pending] = useActionState<
    AgencyMessageTemplateActionState,
    FormData
  >(action, {});

  useRefreshOnActionSuccess(state.success);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Mesaj Şablonu Düzenle" : "Yeni Mesaj Şablonu"}
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
          {item ? <input type="hidden" name="id" value={item.id} /> : null}

          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Sıra No</span>
              <input
                name="rowNo"
                type="number"
                min={1}
                required
                defaultValue={item?.rowNo ?? nextRowNo ?? 1}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-500">Mesaj Adı</span>
              <input
                name="name"
                required
                defaultValue={item?.name ?? ""}
                className={inputClass}
                placeholder="Örn. Rezervasyon Talebi Geldi"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Kime</span>
            <select
              name="recipient"
              required
              defaultValue={item?.recipient ?? ""}
              className={inputClass}
            >
              <option value="">Seçiniz</option>
              {recipientOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
            <p className="text-sm font-semibold text-amber-900">
              Otomatik Zamanlama
            </p>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="scheduleEnabled"
                defaultChecked={item?.scheduleEnabled ?? false}
                className="h-4 w-4 rounded border-gray-300 text-violet-600"
              />
              Otomatik gönderim aktif
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Zamanlama (görünen metin)
              </span>
              <input
                name="scheduleTiming"
                defaultValue={item?.scheduleTiming ?? ""}
                className={inputClass}
                placeholder="örn. Çıkıştan 1 Gün Sonra Saat: 11:00"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Referans</span>
                <select
                  name="scheduleAnchor"
                  defaultValue={item?.scheduleAnchor ?? ""}
                  className={inputClass}
                >
                  <option value="">Manuel</option>
                  <option value="check_in">Giriş tarihi</option>
                  <option value="check_out">Çıkış tarihi</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500">
                  Gün farkı
                </span>
                <input
                  name="scheduleOffsetDays"
                  type="number"
                  defaultValue={item?.scheduleOffsetDays ?? 0}
                  className={inputClass}
                  placeholder="-1 = 1 gün önce, +1 = 1 gün sonra"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Saat</span>
                <input
                  name="scheduleHour"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={item?.scheduleHour ?? 10}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Dakika</span>
                <input
                  name="scheduleMinute"
                  type="number"
                  min={0}
                  max={59}
                  defaultValue={item?.scheduleMinute ?? 0}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">SMS</span>
            <textarea
              name="smsBody"
              defaultValue={item?.smsBody ?? ""}
              className={textareaClass}
              placeholder="SMS mesaj içeriği..."
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">WhatsApp</span>
            <textarea
              name="whatsappBody"
              defaultValue={item?.whatsappBody ?? ""}
              className={textareaClass}
              placeholder="WhatsApp mesaj içeriği..."
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Mail</span>
            <textarea
              name="mailBody"
              defaultValue={item?.mailBody ?? ""}
              className={textareaClass}
              placeholder="E-posta mesaj içeriği..."
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isEdit ? "Kaydet" : "Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
