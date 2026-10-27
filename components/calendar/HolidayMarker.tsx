import { useLocale } from "next-intl";
import { getTurkeyPublicHolidayTooltip } from "@/lib/turkey-public-holidays";

export function holidayDayTitle(
  dateKey: string,
  locale: string = "tr"
): string | undefined {
  return getTurkeyPublicHolidayTooltip(dateKey, locale) ?? undefined;
}

export function HolidayMarker({
  dateKey,
  tone = "default",
}: {
  dateKey: string;
  tone?: "default" | "onDark";
}) {
  const locale = useLocale();
  const label = getTurkeyPublicHolidayTooltip(dateKey, locale);
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

export function HolidayCalendarLegend({
  className = "",
  label = "Resmi tatil",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
      {label}
    </span>
  );
}
