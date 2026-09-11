import { getTurkeyPublicHolidayTooltip } from "@/lib/turkey-public-holidays";

export function holidayDayTitle(dateKey: string): string | undefined {
  return getTurkeyPublicHolidayTooltip(dateKey) ?? undefined;
}

export function HolidayMarker({
  dateKey,
  tone = "default",
}: {
  dateKey: string;
  tone?: "default" | "onDark";
}) {
  const label = getTurkeyPublicHolidayTooltip(dateKey);
  if (!label) return null;

  return (
    <span
      className={`pointer-events-none absolute bottom-0.5 left-1/2 z-[2] h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
        tone === "onDark"
          ? "bg-sky-200 ring-1 ring-white/70"
          : "bg-sky-500"
      }`}
      title={label}
      aria-hidden
    />
  );
}

export function HolidayCalendarLegend({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
      Resmi tatil
    </span>
  );
}
