import MonthlyListingReportPage from "@/components/admin/reports/MonthlyListingReportPage";
import {
  getReportYearOptions,
  REPORT_BASE_YEAR,
} from "@/lib/monthly-listing-report";
import { getMonthlyListingReportData } from "@/lib/queries/monthly-listing-report";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

function parseYear(value: string | undefined) {
  const options = getReportYearOptions();
  const parsed = Number(value);
  if (Number.isFinite(parsed) && options.includes(parsed)) {
    return parsed;
  }
  const currentYear = new Date().getFullYear();
  if (options.includes(currentYear)) return currentYear;
  return REPORT_BASE_YEAR;
}

function parseMonth(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
    return new Date().getMonth() + 1;
  }
  return parsed;
}

export default async function AylikIlanRaporuPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = parseYear(params.year);
  const month = parseMonth(params.month);
  const initialData = await getMonthlyListingReportData(year, month);

  return (
    <MonthlyListingReportPage
      initialYear={year}
      initialMonth={month}
      initialData={initialData}
    />
  );
}
