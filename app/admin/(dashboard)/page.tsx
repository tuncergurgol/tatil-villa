import AdminDashboardPanels from "@/components/admin/AdminDashboardPanels";
import DashboardStatCard from "@/components/admin/DashboardStatCard";
import { getBookingCount, getPendingBookingCount } from "@/lib/queries/bookings";
import {
  getDashboardBookingQuickStats,
  getDashboardBookingStatusStats,
  getDashboardIntegrationLeadStats,
  getDashboardPendingGuestReviewCount,
  getDashboardUnansweredCallbackCount,
} from "@/lib/queries/dashboard-stats";
import { getVillaCount } from "@/lib/queries/villas";
import { pendingGuestReviewsAdminHref } from "@/lib/guest-review-admin-url";
import { Calendar, Clock, Home, MessageSquareQuote } from "lucide-react";
import { buildReservationsHref } from "@/lib/booking-filter-url";
import { BookingStatus } from "@prisma/client";

export default async function AdminDashboardPage() {
  const [
    villaCount,
    bookingCount,
    pendingCount,
    statusStats,
    quickStats,
    unansweredCallbacks,
    integrationLeads,
    pendingGuestReviews,
  ] = await Promise.all([
    getVillaCount(),
    getBookingCount(),
    getPendingBookingCount(),
    getDashboardBookingStatusStats(),
    getDashboardBookingQuickStats(),
    getDashboardUnansweredCallbackCount(),
    getDashboardIntegrationLeadStats(),
    getDashboardPendingGuestReviewCount(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Bont</h1>
      <p className="mt-1 text-gray-500">Genel bakış</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          href="/admin/villalar"
          label="Toplam Villa"
          value={villaCount}
          icon={Home}
          iconWrapClass="bg-teal-100 text-teal-700"
          accentClass="border-teal-100 hover:border-teal-300"
          linkClass="text-teal-700"
        />
        <DashboardStatCard
          href="/admin/rezervasyonlar"
          label="Rezervasyon"
          value={bookingCount}
          icon={Calendar}
          iconWrapClass="bg-blue-100 text-blue-700"
          accentClass="border-blue-100 hover:border-blue-300"
          linkClass="text-blue-700"
        />
        <DashboardStatCard
          href={buildReservationsHref({ status: BookingStatus.NEW })}
          label="Bekleyen"
          value={pendingCount}
          icon={Clock}
          iconWrapClass="bg-amber-100 text-amber-800"
          accentClass="border-amber-100 hover:border-amber-300"
          linkClass="text-amber-800"
        />
        <DashboardStatCard
          href={pendingGuestReviewsAdminHref()}
          label="Onay Bekleyen Misafir Yorumları"
          value={pendingGuestReviews}
          icon={MessageSquareQuote}
          iconWrapClass="bg-purple-100 text-purple-700"
          accentClass="border-purple-100 hover:border-purple-300"
          linkClass="text-purple-700"
        />
      </div>

      <AdminDashboardPanels
        statusStats={statusStats}
        quickStats={quickStats}
        unansweredCallbacks={unansweredCallbacks}
        integrationLeads={integrationLeads}
      />
    </div>
  );
}
