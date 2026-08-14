"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getCustomerStayBookingsAction,
  type CustomerStayBookingRow,
} from "@/app/actions/admin/customers";

type CustomerStaysModalProps = {
  customerId: string;
  customerName: string;
  onClose: () => void;
};

function formatStayDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

export default function CustomerStaysModal({
  customerId,
  customerName,
  onClose,
}: CustomerStaysModalProps) {
  const [stays, setStays] = useState<CustomerStayBookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getCustomerStayBookingsAction(customerId);
      if (!result.ok) {
        setError(result.error);
        setStays([]);
        return;
      }
      setError(null);
      setStays(result.stays);
    });
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="shrink-0 border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Konaklamalar</h2>
          <p className="mt-1 text-sm text-gray-500">{customerName}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isPending ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Yükleniyor...
            </p>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : stays.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Bağlı onaylı rezervasyon kaydı bulunamadı.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Rezervasyon No</th>
                    <th className="px-4 py-3">Villa Adı</th>
                    <th className="px-4 py-3">Giriş - Çıkış</th>
                  </tr>
                </thead>
                <tbody>
                  {stays.map((stay) => (
                    <tr
                      key={stay.id}
                      className="border-t border-gray-100 odd:bg-white even:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {stay.reservationNo}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{stay.villaName}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatStayDate(stay.checkIn)} -{" "}
                        {formatStayDate(stay.checkOut)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            KAPAT
          </button>
        </div>
      </div>
    </div>
  );
}
