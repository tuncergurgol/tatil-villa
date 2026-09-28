"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import {
  AdminTablePaginationBar,
  type AdminPageSize,
} from "@/components/admin/AdminTablePagination";
import { saveOwnerAccountingCodeAction, markChartAccountsExportedAction } from "@/app/actions/admin/chart-account-export";
import { buildChartAccountCsv } from "@/lib/chart-account-export";
import type {
  ChartAccountCustomerRow,
  ChartAccountOwnerRow,
} from "@/lib/queries/chart-account-report";

type Party = "customer" | "owner";
type TransferFilter = "pending" | "exported" | "all";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ChartAccountReportPage({
  customers,
  owners,
}: {
  customers: ChartAccountCustomerRow[];
  owners: ChartAccountOwnerRow[];
}) {
  const router = useRouter();
  const [party, setParty] = useState<Party>("customer");
  const [transfer, setTransfer] = useState<TransferFilter>("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(25);
  const [pending, startTransition] = useTransition();

  const source = party === "customer" ? customers : owners;
  const filtered = useMemo(() => {
    return source.filter((row) => {
      if (transfer === "pending") return !row.exportedAt;
      if (transfer === "exported") return Boolean(row.exportedAt);
      return true;
    });
  }, [source, transfer]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const missingOwnerCodes = owners.filter((row) => row.needsAccountingCode).length;

  function exportCurrent() {
    const ready = filtered.filter((row) => row.accountCode);
    const skipped = filtered.length - ready.length;
    if (ready.length === 0) {
      window.alert(
        skipped > 0
          ? "Muhasebe kodu veya rezervasyon numarası eksik kayıtlar aktarılamaz."
          : "Aktarılacak kayıt yok."
      );
      return;
    }

    startTransition(async () => {
      const result = await markChartAccountsExportedAction({
        kind: party === "customer" ? "CUSTOMER" : "OWNER",
        rows: ready.map((row) => ({
          subjectId: row.subjectId,
          accountCode: row.accountCode,
        })),
      });
      if ("error" in result && result.error) {
        window.alert(result.error);
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(
        `hesap-plani-${party === "customer" ? "musteri" : "ev-sahibi"}-${stamp}.csv`,
        buildChartAccountCsv(ready)
      );
      if (skipped > 0) {
        window.alert(
          `${ready.length} hesap aktarıldı. ${skipped} kayıt kod eksik olduğu için dosyaya alınmadı.`
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hesap Planı Aktarım</h1>
          <p className="text-sm text-gray-500">
            Onaylandı ve tazminat rezervasyonları. Müşteri hesabı 340.01, ev
            sahibi hesabı 320.01.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCurrent}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {pending ? "Hazırlanıyor…" : "CSV AKTAR"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["customer", "Müşteri"],
            ["owner", "Ev sahibi"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setParty(value);
              setPage(1);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              party === value
                ? "bg-indigo-600 text-white"
                : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
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

      {party === "owner" && missingOwnerCodes > 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {missingOwnerCodes} ev sahibinin muhasebe kodu yok. Kod, ev sahibi
          kartına yazılır; kod girilmeden hesap aktarılmaz.
        </p>
      ) : null}

      <p className="text-sm text-gray-500">{filtered.length} kayıt listeleniyor</p>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {party === "customer" ? (
            <CustomerTable rows={visible as ChartAccountCustomerRow[]} />
          ) : (
            <OwnerTable rows={visible as ChartAccountOwnerRow[]} />
          )}
        </div>
        <AdminTablePaginationBar
          page={currentPage}
          totalItems={filtered.length}
          visibleCount={visible.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

function CustomerTable({ rows }: { rows: ChartAccountCustomerRow[] }) {
  return (
    <table className="min-w-[980px] w-full text-left text-sm">
      <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <tr>
          <th className="px-3 py-2">Hesap kodu</th>
          <th className="px-3 py-2">Hesap adı</th>
          <th className="px-3 py-2">Rezervasyon</th>
          <th className="px-3 py-2">Villa</th>
          <th className="px-3 py-2">Durum</th>
          <th className="px-3 py-2">Aktarım</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-16 text-center text-gray-500">
              Bu filtrede müşteri hesabı yok.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.subjectId} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-900">
                {row.accountCode || "Rezervasyon no yok"}
              </td>
              <td className="px-3 py-2">{row.accountName}</td>
              <td className="px-3 py-2">{row.reservationNo}</td>
              <td className="px-3 py-2">{row.villaName}</td>
              <td className="px-3 py-2">{row.statusLabel}</td>
              <td className="px-3 py-2">
                {row.exportedAt ? formatWhen(row.exportedAt) : "Aktarılmadı"}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function OwnerTable({ rows }: { rows: ChartAccountOwnerRow[] }) {
  return (
    <table className="min-w-[1100px] w-full text-left text-sm">
      <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <tr>
          <th className="px-3 py-2">Hesap kodu</th>
          <th className="px-3 py-2">Hesap adı</th>
          <th className="px-3 py-2">Rezervasyon</th>
          <th className="px-3 py-2">Muhasebe kodu</th>
          <th className="px-3 py-2">Aktarım</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-16 text-center text-gray-500">
              Bu filtrede ev sahibi hesabı yok.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.subjectId} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-900">
                {row.accountCode || "Kod bekleniyor"}
              </td>
              <td className="px-3 py-2">{row.accountName}</td>
              <td className="px-3 py-2">{row.reservationCount}</td>
              <td className="px-3 py-2">
                {row.needsAccountingCode ? (
                  <OwnerCodeForm ownerId={row.ownerId} />
                ) : (
                  row.storedAccountingCode
                )}
              </td>
              <td className="px-3 py-2">
                {row.exportedAt ? formatWhen(row.exportedAt) : "Aktarılmadı"}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function OwnerCodeForm({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        startTransition(async () => {
          const result = await saveOwnerAccountingCodeAction({
            ownerId,
            accountingCode: code,
          });
          if (result.error) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Muhasebe kodu"
        className="w-36 rounded-lg border border-amber-300 px-2 py-1.5 text-sm outline-none focus:border-amber-500"
        required
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Kaydediliyor" : "Karta yaz"}
      </button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </form>
  );
}
