"use client";

import { useTransition } from "react";
import { RefreshCw, XCircle } from "lucide-react";
import {
  cancelYolcu360OrderAction,
  refreshYolcu360OrderAction,
} from "@/app/actions/admin/yolcu360-settings";
import { formatYolcu360Money } from "@/lib/yolcu360/format";

type OrderRow = {
  id: string;
  yolcu360OrderId: string;
  trackingId: string;
  status: string;
  passengerName: string;
  passengerEmail: string;
  carBrand: string;
  carModel: string;
  vendorName: string;
  totalAmount: number;
  currency: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  createdAt: Date;
};

export default function Yolcu360OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [isPending, startTransition] = useTransition();

  function refresh(orderId: string) {
    startTransition(async () => {
      await refreshYolcu360OrderAction(orderId);
    });
  }

  function cancel(orderId: string) {
    if (!confirm("Bu siparişi iptal etmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await cancelYolcu360OrderAction(orderId);
    });
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        Henüz Yolcu360 siparişi yok.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Tarih</th>
            <th className="px-4 py-3">Yolcu</th>
            <th className="px-4 py-3">Araç</th>
            <th className="px-4 py-3">Tedarikçi</th>
            <th className="px-4 py-3">Tutar</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-gray-50">
              <td className="px-4 py-3 text-gray-600">
                {new Date(order.createdAt).toLocaleString("tr-TR")}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{order.passengerName}</div>
                <div className="text-xs text-gray-500">{order.passengerEmail}</div>
                {order.trackingId ? (
                  <div className="text-xs text-gray-400">{order.trackingId}</div>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {order.carBrand} {order.carModel}
              </td>
              <td className="px-4 py-3">{order.vendorName}</td>
              <td className="px-4 py-3 font-medium">
                {formatYolcu360Money(order.totalAmount, order.currency)}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => refresh(order.yolcu360OrderId)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    title="Durumu güncelle"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => cancel(order.yolcu360OrderId)}
                    className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="İptal et"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
