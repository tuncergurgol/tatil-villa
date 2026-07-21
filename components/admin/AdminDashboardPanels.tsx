import { BookingStatus } from "@prisma/client";
import DashboardStatCard from "@/components/admin/DashboardStatCard";
import {
  buildCallbackRequestsHref,
  buildReservationsHref,
} from "@/lib/booking-filter-url";
import { BOOKING_STATUS_META } from "@/lib/booking-status";
import type {
  DashboardBookingQuickStats,
  DashboardBookingStatusStats,
} from "@/lib/queries/dashboard-stats";

type Props = {
  statusStats: DashboardBookingStatusStats;
  quickStats: DashboardBookingQuickStats;
  unansweredCallbacks: number;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
      {children}
    </h2>
  );
}

export default function AdminDashboardPanels({
  statusStats,
  quickStats,
  unansweredCallbacks,
}: Props) {
  const statusCards = [
    {
      label: BOOKING_STATUS_META[BookingStatus.NEW].label,
      value: statusStats.newCount,
      href: buildReservationsHref({ status: BookingStatus.NEW }),
      accent: "hover:border-violet-300",
    },
    {
      label: BOOKING_STATUS_META[BookingStatus.PREPAYMENT].label,
      value: statusStats.prepaymentCount,
      href: buildReservationsHref({ status: BookingStatus.PREPAYMENT }),
      accent: "hover:border-amber-300",
    },
    {
      label: BOOKING_STATUS_META[BookingStatus.CONFIRMATION_SENT].label,
      value: statusStats.confirmationSentCount,
      href: buildReservationsHref({ status: BookingStatus.CONFIRMATION_SENT }),
      accent: "hover:border-sky-300",
    },
    {
      label: BOOKING_STATUS_META[BookingStatus.CONFIRMED].label,
      value: statusStats.confirmedCount,
      href: buildReservationsHref({ status: BookingStatus.CONFIRMED }),
      accent: "hover:border-emerald-300",
    },
  ] as const;

  const quickCards = [
    {
      label: "Tatile 2 Gün Kalanlar",
      value: quickStats.checkIn2Days,
      href: buildReservationsHref({ quick: "check_in_2_days" }),
    },
    {
      label: "Tatile 1 Gün Kalanlar",
      value: quickStats.checkIn1Day,
      href: buildReservationsHref({ quick: "check_in_1_day" }),
    },
    {
      label: "Bugün Girişli Rezervasyonlar",
      value: quickStats.checkInToday,
      href: buildReservationsHref({ quick: "check_in_today" }),
    },
    {
      label: "Çıkışa 2 Gün Kalanlar",
      value: quickStats.checkOut2Days,
      href: buildReservationsHref({ quick: "check_out_2_days" }),
    },
    {
      label: "Çıkışa 1 Gün Kalanlar",
      value: quickStats.checkOut1Day,
      href: buildReservationsHref({ quick: "check_out_1_day" }),
    },
    {
      label: "Bugün Çıkanlar",
      value: quickStats.checkOutToday,
      href: buildReservationsHref({ quick: "check_out_today" }),
    },
  ] as const;

  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-3">
        <SectionTitle>Rezervasyon durumları</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((card) => (
            <DashboardStatCard
              key={card.label}
              href={card.href}
              label={card.label}
              value={card.value}
              accentClass={card.accent}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Giriş / çıkış takibi</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {quickCards.map((card) => (
            <DashboardStatCard
              key={card.label}
              href={card.href}
              label={card.label}
              value={card.value}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Sizi Arayalım</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardStatCard
            href={buildCallbackRequestsHref("unanswered")}
            label="Yeni gelen ve cevaplanmayan"
            value={unansweredCallbacks}
            accentClass="hover:border-orange-300"
          />
        </div>
      </section>
    </div>
  );
}
