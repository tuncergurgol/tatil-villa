import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon;
  iconWrapClass?: string;
  iconClass?: string;
  accentClass?: string;
  linkClass?: string;
};

export default function DashboardStatCard({
  href,
  label,
  value,
  icon: Icon,
  iconWrapClass = "bg-teal-50 text-teal-700",
  iconClass = "h-4 w-4",
  accentClass = "border-gray-200 hover:border-teal-300",
  linkClass = "text-teal-700",
}: Props) {
  return (
    <Link
      href={href}
      className={`group block rounded-xl border bg-white px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accentClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconWrapClass}`}
        >
          <Icon className={iconClass} aria-hidden />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none text-gray-900">
        {value}
      </p>
      <p className={`mt-1 text-[11px] font-medium ${linkClass}`}>
        Listeyi aç →
      </p>
    </Link>
  );
}
