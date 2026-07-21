import Link from "next/link";

type Props = {
  href: string;
  label: string;
  value: number;
  accentClass?: string;
};

export default function DashboardStatCard({
  href,
  label,
  value,
  accentClass = "border-gray-200 hover:border-teal-300",
}: Props) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${accentClass}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900">
        {value}
      </p>
      <p className="mt-2 text-xs font-medium text-teal-700">Listeyi aç →</p>
    </Link>
  );
}
