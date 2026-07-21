import AdminDashboardPanels from "@/components/admin/AdminDashboardPanels";
import { getBookingCount, getPendingBookingCount } from "@/lib/queries/bookings";
import {
  getDashboardBookingQuickStats,
  getDashboardBookingStatusStats,
  getDashboardUnansweredCallbackCount,
} from "@/lib/queries/dashboard-stats";
import { getVillaCount } from "@/lib/queries/villas";
import { prisma } from "@/lib/db";
import { Calendar, Clock, Home } from "lucide-react";

export default async function AdminDashboardPage() {
  const [
    villaCount,
    bookingCount,
    pendingCount,
    regionCount,
    statusStats,
    quickStats,
    unansweredCallbacks,
  ] = await Promise.all([
    getVillaCount(),
    getBookingCount(),
    getPendingBookingCount(),
    prisma.region.count(),
    getDashboardBookingStatusStats(),
    getDashboardBookingQuickStats(),
    getDashboardUnansweredCallbackCount(),
  ]);

  const stats = [
    { label: "Toplam Villa", value: villaCount, icon: Home, color: "bg-teal-500" },
    { label: "Rezervasyon", value: bookingCount, icon: Calendar, color: "bg-blue-500" },
    { label: "Bekleyen", value: pendingCount, icon: Clock, color: "bg-amber-500" },
    { label: "Bölge", value: regionCount, icon: Home, color: "bg-purple-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">Genel bakış</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${stat.color} p-2 text-white`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminDashboardPanels
        statusStats={statusStats}
        quickStats={quickStats}
        unansweredCallbacks={unansweredCallbacks}
      />
    </div>
  );
}
