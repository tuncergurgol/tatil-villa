"use client";

import { useMemo, useState, useTransition } from "react";
import { BarChart3, Download, Search } from "lucide-react";
import * as XLSX from "xlsx";
import {
  getMonthLabel,
  getReportYearOptions,
  REPORT_MONTHS,
  type MonthlyListingReportRow,
} from "@/lib/monthly-listing-report";

type ReportData = {
  year: number;
  month: number;
  agencyLabel: string;
  listingDateRange: string;
  rows: MonthlyListingReportRow[];
};

interface MonthlyListingReportPageProps {
  initialYear: number;
  initialMonth: number;
  initialData: ReportData;
}

const TABLE_HEADERS = [
  "Aracı / Acente",
  "İlan Tarih Aralığı",
  "İlan Numarası",
  "İlan Linki",
  "İlan Sahibi (Belge Sahibi)",
  "İlan Adresi",
  "Konut İzin Belge No",
  "İlan Ücreti",
] as const;

function rowToCells(row: MonthlyListingReportRow) {
  return [
    row.agencyLabel,
    row.listingDateRange,
    row.listingNumber,
    row.listingUrl,
    row.listingOwner,
    row.listingAddress,
    row.housingPermitNo,
    row.listingFee,
  ];
}

function downloadExcel(rows: MonthlyListingReportRow[], fileName: string) {
  const sheetRows = [
    [...TABLE_HEADERS],
    ...rows.map((row) => rowToCells(row)),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Aylik Ilan Raporu");
  XLSX.writeFile(workbook, fileName);
}

export default function MonthlyListingReportPage({
  initialYear,
  initialMonth,
  initialData,
}: MonthlyListingReportPageProps) {
  const yearOptions = useMemo(() => getReportYearOptions(), []);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [report, setReport] = useState<ReportData>(initialData);
  const [isPending, startTransition] = useTransition();

  function handleList() {
    startTransition(async () => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      const response = await fetch(`/api/admin/monthly-listing-report?${params}`);
      if (!response.ok) {
        window.alert("Rapor yüklenemedi.");
        return;
      }
      const data = (await response.json()) as ReportData;
      setReport(data);
    });
  }

  function handleDownload() {
    if (report.rows.length === 0) {
      window.alert("İndirilecek kayıt bulunamadı.");
      return;
    }

    const monthLabel = getMonthLabel(report.month).toLocaleLowerCase("tr-TR");
    downloadExcel(
      report.rows,
      `aylik-ilan-raporu-${report.year}-${monthLabel}.xlsx`
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Aylık İlan Raporu (7464 S.K.)
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {report.rows.length} kayıt - {report.listingDateRange}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Yıl
              </span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="min-w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Ay
              </span>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="min-w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {REPORT_MONTHS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleList}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              LİSTELE
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={report.rows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              EXCEL İNDİR
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-900">
          <BarChart3 className="h-4 w-4 shrink-0" />
          <span>
            {report.agencyLabel} — {report.listingDateRange}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="bg-sky-100/80 text-xs font-semibold uppercase tracking-wide text-gray-700">
              <tr>
                <th className="w-12 px-3 py-3">#</th>
                {TABLE_HEADERS.map((header) => (
                  <th key={header} className="px-3 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.length > 0 ? (
                report.rows.map((row, index) => (
                  <tr
                    key={`${row.listingUrl}-${index}`}
                    className="border-b border-gray-100 odd:bg-white even:bg-gray-50/60"
                  >
                    <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-3 text-gray-800">{row.agencyLabel}</td>
                    <td className="px-3 py-3 text-gray-800">
                      {row.listingDateRange}
                    </td>
                    <td className="px-3 py-3 text-gray-400">{row.listingNumber || ""}</td>
                    <td className="px-3 py-3">
                      <a
                        href={`https://${row.listingUrl.replace(/^https?:\/\//i, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:underline"
                      >
                        {row.listingUrl}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-gray-800">{row.listingOwner}</td>
                    <td className="px-3 py-3 text-gray-700">{row.listingAddress}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {row.housingPermitNo}
                    </td>
                    <td className="px-3 py-3 text-gray-400">{row.listingFee || ""}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={TABLE_HEADERS.length + 1}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Seçilen dönem için belge numarası olan ilan bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
