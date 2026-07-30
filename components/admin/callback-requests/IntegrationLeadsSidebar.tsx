"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bus, Car, Check } from "lucide-react";
import {
  markBiletallInquirySeenAction,
  markYolcu360OrderSeenAction,
} from "@/app/actions/admin/integration-inbox";
import { formatYolcu360Money } from "@/lib/yolcu360/format-money";

type Yolcu360Lead = {
  id: string;
  yolcu360OrderId: string;
  passengerName: string;
  passengerPhone: string;
  carBrand: string;
  carModel: string;
  vendorName: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: Date | string;
};

type ObiletLead = {
  id: string;
  pnr: string;
  summary: string;
  sourceSite: string;
  sourceDomain: string;
  createdAt: Date | string;
};

type Props = {
  yolcu360Orders: Yolcu360Lead[];
  biletallInquiries: ObiletLead[];
};

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function LeadCard({
  title,
  subtitle,
  detail,
  createdAt,
  href,
  onMarkSeen,
  busy,
  icon: Icon,
  accentClass,
}: {
  title: string;
  subtitle: string;
  detail: string;
  createdAt: Date | string;
  href: string;
  onMarkSeen: () => void;
  busy: boolean;
  icon: typeof Car;
  accentClass: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accentClass}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
          <p className="truncate text-xs text-gray-600">{subtitle}</p>
          {detail ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{detail}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-gray-400">
            {formatDateTime(createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={href}
          className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Detay
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={onMarkSeen}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" />
          Okundu
        </button>
      </div>
    </div>
  );
}

export default function IntegrationLeadsSidebar({
  yolcu360Orders,
  biletallInquiries,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function markYolcu360(id: string) {
    startTransition(async () => {
      await markYolcu360OrderSeenAction(id);
      router.refresh();
    });
  }

  function markObilet(id: string) {
    startTransition(async () => {
      await markBiletallInquirySeenAction(id);
      router.refresh();
    });
  }

  const empty = yolcu360Orders.length === 0 && biletallInquiries.length === 0;

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/80 lg:w-80">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <h2 className="text-sm font-bold text-gray-900">Entegrasyon talepleri</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Obilet {biletallInquiries.length} · Yolcu360 {yolcu360Orders.length}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {empty ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-xs text-gray-500">
            Yeni Obilet veya Yolcu360 talebi yok.
          </p>
        ) : null}

        {biletallInquiries.length > 0 ? (
          <section className="space-y-2">
            <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
              Obilet
            </h3>
            {biletallInquiries.map((item) => (
              <LeadCard
                key={item.id}
                icon={Bus}
                accentClass="bg-sky-100 text-sky-700"
                title={item.pnr ? `PNR ${item.pnr}` : "Yeni bilet işlemi"}
                subtitle={item.sourceSite || item.sourceDomain || "Obilet"}
                detail={item.summary.split("\n").slice(0, 2).join(" · ")}
                createdAt={item.createdAt}
                href="/admin/obilet"
                busy={isPending}
                onMarkSeen={() => markObilet(item.id)}
              />
            ))}
          </section>
        ) : null}

        {yolcu360Orders.length > 0 ? (
          <section className="space-y-2">
            <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Yolcu360
            </h3>
            {yolcu360Orders.map((item) => (
              <LeadCard
                key={item.id}
                icon={Car}
                accentClass="bg-emerald-100 text-emerald-700"
                title={item.passengerName || item.yolcu360OrderId}
                subtitle={`${item.carBrand} ${item.carModel}`.trim() || item.vendorName}
                detail={`${formatYolcu360Money(item.totalAmount, item.currency)} · ${item.passengerPhone || "—"} · ${item.status}`}
                createdAt={item.createdAt}
                href="/admin/yolcu360/siparisler"
                busy={isPending}
                onMarkSeen={() => markYolcu360(item.id)}
              />
            ))}
          </section>
        ) : null}
      </div>
    </aside>
  );
}
