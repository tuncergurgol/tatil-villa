"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { deleteAgencyMessageTemplate } from "@/app/actions/admin/agency-message-templates";
import AgencyMessageTemplateFormModal from "@/components/admin/agency-message-templates/AgencyMessageTemplateFormModal";
import { getAgencyMessageRecipientLabel } from "@/lib/agency-message-recipients";
import {
  formatAgencyMessageRowNo,
  getAgencyMessageRowSortKey,
} from "@/lib/agency-message-row-no";
import { formatScheduleTiming } from "@/lib/agency-message-schedule";
import type { AgencyMessageTemplateItem } from "@/lib/queries/agency-message-templates";

interface AgencyMessageTemplateManagementProps {
  items: AgencyMessageTemplateItem[];
}

function truncateText(value: string, maxLength = 80) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "-";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

export default function AgencyMessageTemplateManagement({
  items,
}: AgencyMessageTemplateManagementProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgencyMessageTemplateItem | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          getAgencyMessageRowSortKey(a.rowNo) -
            getAgencyMessageRowSortKey(b.rowNo) ||
          a.sortOrder - b.sortOrder
      ),
    [items]
  );

  const nextRowNo = useMemo(() => {
    if (sortedItems.length === 0) return 1;
    return Math.max(...sortedItems.map((item) => item.rowNo)) + 1;
  }, [sortedItems]);

  function handleDelete(item: AgencyMessageTemplateItem) {
    if (!window.confirm(`"${item.name}" mesaj şablonu silinsin mi?`)) return;

    setError(null);
    setDeletingId(item.id);
    startDeleteTransition(async () => {
      const result = await deleteAgencyMessageTemplate(item.id);
      setDeletingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (editingItem?.id === item.id) {
        setEditingItem(null);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-[180px] items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Mesaj İçeriği</h1>
                <p className="text-xs text-gray-500">
                  Acente mesaj şablonlarını düzenleyin
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Kayıt Ekle
            </button>
          </div>

          {error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-16 px-4 py-3">Sıra</th>
                <th className="min-w-[180px] px-4 py-3">Mesaj Adı</th>
                <th className="min-w-[200px] px-4 py-3">Zamanlama</th>
                <th className="w-36 px-4 py-3">Kime</th>
                <th className="min-w-[200px] px-4 py-3">SMS</th>
                <th className="min-w-[200px] px-4 py-3">WhatsApp</th>
                <th className="min-w-[200px] px-4 py-3">Mail</th>
                <th className="w-44 px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length > 0 ? (
                sortedItems.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3 font-semibold text-gray-500">
                      {formatAgencyMessageRowNo(item.rowNo)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <span
                        className={
                          item.scheduleEnabled
                            ? "inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800"
                            : ""
                        }
                      >
                        {formatScheduleTiming(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getAgencyMessageRecipientLabel(item.recipient)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-flex items-start gap-1.5">
                        <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                        <span className="line-clamp-3 whitespace-pre-wrap break-words">
                          {truncateText(item.smsBody)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-flex items-start gap-1.5">
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="line-clamp-3 whitespace-pre-wrap break-words">
                          {truncateText(item.whatsappBody)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-flex items-start gap-1.5">
                        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                        <span className="line-clamp-3 whitespace-pre-wrap break-words">
                          {truncateText(item.mailBody)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Değiştir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={isDeleting && deletingId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Henüz mesaj şablonu tanımlanmadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen ? (
        <AgencyMessageTemplateFormModal
          nextRowNo={nextRowNo}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
      {editingItem ? (
        <AgencyMessageTemplateFormModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </div>
  );
}
