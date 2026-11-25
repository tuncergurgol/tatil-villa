"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import {
  AdminTablePaginationBar,
  type AdminPageSize,
} from "@/components/admin/AdminTablePagination";
import { markChartAccountsExportedAction } from "@/app/actions/admin/chart-account-export";
import {
  CHART_ACCOUNT_KIND,
  IYZICO_BANK_ACCOUNT_CODE,
  IYZICO_COMMISSION_ACCOUNT_CODE,
  VIRMAN_SHEET_HEADERS,
  VIRMAN_SHEET_NAME,
  iyzicoTahsilatSheetRows,
  type IyzicoTahsilatRow,
} from "@/lib/chart-account-export";

type TransferFilter = "pending" | "exported" | "all";

function formatDay(iso: string) {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function formatWhen(iso: string | null) {
  if (!iso) return "Aktarılmadı";
  return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
}

function formatMoney(amount: number) {
  return amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function IyzicoTahsilatReportPage({
  rows,
}: {
  rows: IyzicoTahsilatRow[];
}) {
  const router = useRouter();
  const [transfer, setTransfer] = useState<TransferFilter>("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(25);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (transfer === "pending") return !row.exportedAt;
      if (transfer === "exported") return Boolean(row.exportedAt);
      return true;
    });
  }, [rows, transfer]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function exportCurrent() {
    const ready = filtered.filter(
      (row) => row.customerAccountCode && row.paidAmount > 0
    );
    const skipped = filtered.length - ready.length;
    if (ready.length === 0) {
      window.alert(
        skipped > 0
          ? "Rezervasyon numarası olmayan tahsilatlar aktarılamaz."
          : "Aktarılacak kayıt yok."
      );
      return;
    }

    startTransition(async () => {
      const result = await markChartAccountsExportedAction({
        kind: CHART_ACCOUNT_KIND.IYZICO_TAHSILAT,
        rows: ready.map((row) => ({
          subjectId: row.subjectId,
          accountCode: row.customerAccountCode,
        })),
      });
      if ("error" in result && result.error) {
        window.alert(result.error);
        return;
      }

      const XLSX = await import("xlsx");
      const dataRows = ready.flatMap((row) => iyzicoTahsilatSheetRows(row));
      const sheet = XLSX.utils.aoa_to_sheet([
        [...VIRMAN_SHEET_HEADERS],
        ...dataRows,
      ]);
      for (let rowIndex = 1; rowIndex <= dataRows.length; rowIndex += 1) {
        for (const column of [1, 5]) {
          const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: column })];
          if (cell) cell.z = "dd.mm.yyyy";
        }
      }
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, VIRMAN_SHEET_NAME);
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(book, `iyzico-tahsilat-fis-${stamp}.xlsx`);
      if (skipped > 0) {
        window.alert(
          `${ready.length} fiş aktarıldı. ${skipped} kayıt rezervasyon numarası olmadığı için dosyaya alınmadı.`
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İyzico Tahsilat Fişi</h1>
          <p className="text-sm text-gray-500">
            İptal rezervasyonlar listelenmez. Müşteriden tahsilat alındığı gün.
            Excel her fiş için{" "}
            {IYZICO_BANK_ACCOUNT_CODE} borç, {IYZICO_COMMISSION_ACCOUNT_CODE}{" "}
            borç ve 340.01.{"{rezervasyon}"} alacak satırı yazar.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCurrent}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {pending ? "Hazırlanıyor…" : "EXCEL AKTAR"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pending", "Aktarılmayan"],
            ["exported", "Aktarılan"],
            ["all", "Tümü"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTransfer(value);
              setPage(1);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              transfer === value
                ? "bg-slate-800 text-white"
                : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">{filtered.length} kayıt listeleniyor</p>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Rezervasyon</th>
                <th className="px-3 py-2">Tahsilat</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">340 hesap</th>
                <th className="px-3 py-2 text-right">108 borç</th>
                <th className="px-3 py-2 text-right">780 borç</th>
                <th className="px-3 py-2 text-right">340 alacak</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">Aktarım</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-500">
                    Bu filtrede tahsilat fişi yok.
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.subjectId} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {row.reservationNo}
                    </td>
                    <td className="px-3 py-2">{formatDay(row.collectedOn)}</td>
                    <td className="px-3 py-2">{row.guestName}</td>
                    <td className="px-3 py-2">{row.customerAccountCode || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(row.bankAmount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(row.commissionAmount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(row.paidAmount)}
                    </td>
                    <td className="px-3 py-2">{row.statusLabel}</td>
                    <td className="px-3 py-2">{formatWhen(row.exportedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTablePaginationBar
          page={currentPage}
          totalItems={filtered.length}
          visibleCount={visible.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
