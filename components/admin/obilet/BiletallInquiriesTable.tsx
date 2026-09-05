"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { markBiletallInquirySeenAction } from "@/app/actions/admin/integration-inbox";

type InquiryRow = {
  id: string;
  pnr: string;
  summary: string;
  sourceSite: string;
  sourceDomain: string;
  status: string;
  adminSeenAt: Date | null;
  createdAt: Date;
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default function BiletallInquiriesTable({
  inquiries,
}: {
  inquiries: InquiryRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function markSeen(id: string) {
    startTransition(async () => {
      await markBiletallInquirySeenAction(id);
      router.refresh();
    });
  }

  if (inquiries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        Henüz Obilet talebi yok.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Tarih</th>
            <th className="px-4 py-3">Site</th>
            <th className="px-4 py-3">PNR</th>
            <th className="px-4 py-3">Özet</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((item) => (
            <tr key={item.id} className="border-b border-gray-50">
              <td className="px-4 py-3 text-gray-600">
                {formatDateTime(item.createdAt)}
              </td>
              <td className="px-4 py-3 text-gray-700">
                {item.sourceSite || item.sourceDomain || "—"}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">
                {item.pnr || "—"}
              </td>
              <td className="px-4 py-3 text-gray-600">
                <span className="line-clamp-3 whitespace-pre-line">
                  {item.summary || "—"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    item.adminSeenAt
                      ? "bg-gray-100 text-gray-600"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.adminSeenAt ? "Okundu" : "Yeni"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {!item.adminSeenAt ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => markSeen(item.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Okundu
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
