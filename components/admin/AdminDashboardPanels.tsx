import { BookingStatus } from "@prisma/client";
import {
  AlarmClock,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Clock3,
  DoorOpen,
  LogOut,
  PhoneIncoming,
  Sparkles,
  Wallet,
} from "lucide-react";
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

function buildQuickHref(
  quick: Parameters<typeof buildReservationsHref>[0]["quick"]
) {
  return buildReservationsHref({
    status: BookingStatus.CONFIRMED,
    quick,
  });
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
      icon: Sparkles,
      iconWrapClass: "bg-violet-100 text-violet-700",
      accentClass: "border-violet-100 hover:border-violet-300",
      linkClass: "text-violet-700",
    },
    {
      label: BOOKING_STATUS_META[BookingStatus.PREPAYMENT].label,
      value: statusStats.prepaymentCount,
      href: buildReservationsHref({ status: BookingStatus.PREPAYMENT }),
      icon: Wallet,
      iconWrapClass: "bg-amber-100 text-amber-800",
      accentClass: "border-amber-100 hover:border-amber-300",
      linkClass: "text-amber-800",
    },
    {
      label: BOOKING_STATUS_META[BookingStatus.CONFIRMATION_SENT].label,
      value: statusStats.confirmationSentCount,
      href: buildReservationsHref({ status: BookingStatus.CONFIRMATION_SENT }),
      icon: Clock3,
      iconWrapClass: "bg-sky-100 text-sky-800",
      accentClass: "border-sky-100 hover:border-sky-300",
      linkClass: "text-sky-800",
    },
    {
      label: BOOKING_STATUS_META[BookingStatus.CONFIRMED].label,
      value: statusStats.confirmedCount,
      href: buildReservationsHref({ status: BookingStatus.CONFIRMED }),
      icon: BadgeCheck,
      iconWrapClass: "bg-emerald-100 text-emerald-700",
      accentClass: "border-emerald-100 hover:border-emerald-300",
      linkClass: "text-emerald-700",
    },
  ] as const;

  const quickCards = [
    {
      label: "Tatile 2 Gün Kalanlar",
      value: quickStats.checkIn2Days,
      href: buildQuickHref("check_in_2_days"),
      icon: CalendarDays,
      iconWrapClass: "bg-indigo-100 text-indigo-700",
      accentClass: "border-indigo-100 hover:border-indigo-300",
      linkClass: "text-indigo-700",
    },
    {
      label: "Tatile 1 Gün Kalanlar",
      value: quickStats.checkIn1Day,
      href: buildQuickHref("check_in_1_day"),
      icon: CalendarClock,
      iconWrapClass: "bg-blue-100 text-blue-700",
      accentClass: "border-blue-100 hover:border-blue-300",
      linkClass: "text-blue-700",
    },
    {
      label: "Bugün Girişli Rezervasyonlar",
      value: quickStats.checkInToday,
      href: buildQuickHref("check_in_today"),
      icon: DoorOpen,
      iconWrapClass: "bg-teal-100 text-teal-700",
      accentClass: "border-teal-100 hover:border-teal-300",
      linkClass: "text-teal-700",
    },
    {
      label: "Çıkışa 2 Gün Kalanlar",
      value: quickStats.checkOut2Days,
      href: buildQuickHref("check_out_2_days"),
      icon: CalendarDays,
      iconWrapClass: "bg-purple-100 text-purple-700",
      accentClass: "border-purple-100 hover:border-purple-300",
      linkClass: "text-purple-700",
    },
    {
      label: "Çıkışa 1 Gün Kalanlar",
      value: quickStats.checkOut1Day,
      href: buildQuickHref("check_out_1_day"),
      icon: AlarmClock,
      iconWrapClass: "bg-rose-100 text-rose-700",
      accentClass: "border-rose-100 hover:border-rose-300",
      linkClass: "text-rose-700",
    },
    {
      label: "Bugün Çıkanlar",
      value: quickStats.checkOutToday,
      href: buildQuickHref("check_out_today"),
      icon: LogOut,
      iconWrapClass: "bg-orange-100 text-orange-700",
      accentClass: "border-orange-100 hover:border-orange-300",
      linkClass: "text-orange-700",
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
              icon={card.icon}
              iconWrapClass={card.iconWrapClass}
              accentClass={card.accentClass}
              linkClass={card.linkClass}
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
              icon={card.icon}
              iconWrapClass={card.iconWrapClass}
              accentClass={card.accentClass}
              linkClass={card.linkClass}
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
            icon={PhoneIncoming}
            iconWrapClass="bg-orange-100 text-orange-700"
            accentClass="border-orange-100 hover:border-orange-300"
            linkClass="text-orange-700"
          />
        </div>
      </section>
    </div>
  );
}
