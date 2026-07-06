"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  XCircle,
} from "lucide-react";
import VillaDocumentModal from "@/components/admin/villas/VillaDocumentModal";
import {
  formatKonutBelgeCheckLabel,
  type KonutBelgeCheckStatus,
} from "@/lib/konut-belge-check";

type CheckRow = {
  villaId: string;
  villaName: string;
  slug: string;
  documentNo: string;
  documentOwnerName: string;
  checkUrl: string;
  status: KonutBelgeCheckStatus;
  checkedAt: string | null;
  errorMessage?: string;
};

type StatusFilter = "ALL" | "VALID" | "INVALID" | "PENDING";

interface DocumentCheckPageProps {
  initialRows: CheckRow[];
}

const BATCH_SIZE = 8;

const EXCEL_HEADERS = [
  "Ev Adı",
  "Belge Sahibi",
  "Belge No",
  "KTB Kontrol Linki",
  "Durum",
  "Son Kontrol",
  "Açıklama",
] as const;

function getFilterFileSuffix(filter: StatusFilter) {
  switch (filter) {
    case "VALID":
      return "gecerli";
    case "INVALID":
      return "gecersiz";
    case "PENDING":
      return "beklemede";
    default:
      return "tum";
  }
}

function rowToExcelCells(row: CheckRow) {
  return [
    row.villaName,
    row.documentOwnerName,
    row.documentNo,
    row.checkUrl,
    formatKonutBelgeCheckLabel(row.status),
    formatCheckedAt(row.checkedAt),
    row.errorMessage ?? "",
  ];
}

async function downloadExcel(rows: CheckRow[], fileName: string) {
  const XLSX = await import("xlsx");
  const sheetRows = [
    [...EXCEL_HEADERS],
    ...rows.map((row) => rowToExcelCells(row)),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Belge Kontrol");
  XLSX.writeFile(workbook, fileName);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function formatCheckedAt(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function matchesStatusFilter(
  status: KonutBelgeCheckStatus,
  filter: StatusFilter
) {
  if (filter === "ALL") return true;
  if (filter === "VALID") return status === "VALID";
  if (filter === "PENDING") return status === "PENDING";
  return status === "INVALID" || status === "ERROR";
}

function StatFilterButton({
  label,
  value,
  count,
  active,
  onClick,
  className,
  activeClassName,
}: {
  label: string;
  value: StatusFilter;
  count: number;
  active: boolean;
  onClick: (value: StatusFilter) => void;
  className: string;
  activeClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={active}
      className={`rounded-xl px-4 py-3 text-left transition ${className} ${
        active
          ? `${activeClassName} ring-2 ring-offset-2 ring-current`
          : "hover:brightness-[0.98]"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{count}</p>
    </button>
  );
}

function StatusBadge({ status }: { status: KonutBelgeCheckStatus }) {
  const label = formatKonutBelgeCheckLabel(status);
  if (status === "VALID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
      <XCircle className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export default function DocumentCheckPage({ initialRows }: DocumentCheckPageProps) {
  const [rows, setRows] = useState<CheckRow[]>(initialRows);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [documentModal, setDocumentModal] = useState<{
    villaId: string;
    villaName: string;
  } | null>(null);
  const [isLoadingList, startLoadList] = useTransition();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const stopRequestedRef = useRef(false);

  const stats = useMemo(() => {
    const valid = rows.filter((row) => row.status === "VALID").length;
    const invalid = rows.filter(
      (row) => row.status === "INVALID" || row.status === "ERROR"
    ).length;
    const pending = rows.filter((row) => row.status === "PENDING").length;
    return { valid, invalid, pending, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesStatusFilter(row.status, statusFilter)),
    [rows, statusFilter]
  );

  const emptyFilterMessage = useMemo(() => {
    switch (statusFilter) {
      case "VALID":
        return "Geçerli belge bulunamadı.";
      case "INVALID":
        return "Geçersiz belge bulunamadı.";
      case "PENDING":
        return "Beklemede olan kayıt bulunamadı.";
      default:
        return "Konut Belgesi (7464 S.K.) olan kayıt bulunamadı.";
    }
  }, [statusFilter]);

  function handleRefreshList() {
    startLoadList(async () => {
      const response = await fetch("/api/admin/konut-belge-check");
      if (!response.ok) {
        window.alert("Liste yüklenemedi.");
        return;
      }
      const data = (await response.json()) as { rows: CheckRow[] };
      setRows((current) => {
        const statusById = new Map(
          current.map((row) => [row.villaId, row] as const)
        );
        return data.rows.map((row) => {
          const existing = statusById.get(row.villaId);
          if (!existing || existing.status === "PENDING") return row;
          return {
            ...row,
            status: existing.status,
            checkedAt: existing.checkedAt,
            errorMessage: existing.errorMessage,
          };
        });
      });
    });
  }

  async function runChecks(targetRows: CheckRow[]) {
    if (targetRows.length === 0) {
      window.alert("Kontrol edilecek konut belgesi bulunamadı.");
      return;
    }

    stopRequestedRef.current = false;
    setIsRunning(true);
    setProgress({ done: 0, total: targetRows.length });

    const batches = chunkArray(targetRows, BATCH_SIZE);

    for (const batch of batches) {
      if (stopRequestedRef.current) break;

      const response = await fetch("/api/admin/konut-belge-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villaIds: batch.map((row) => row.villaId) }),
      });

      if (!response.ok) {
        window.alert("Belge kontrolü sırasında hata oluştu.");
        break;
      }

      const data = (await response.json()) as { results: CheckRow[] };
      const resultMap = new Map(
        data.results.map((result) => [result.villaId, result] as const)
      );

      setRows((current) =>
        current.map((row) => resultMap.get(row.villaId) ?? row)
      );
      setProgress((current) => ({
        ...current,
        done: Math.min(current.done + batch.length, current.total),
      }));

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setIsRunning(false);
  }

  function handleRunAll() {
    void runChecks(rows);
  }

  function handleRunPending() {
    void runChecks(rows.filter((row) => row.status === "PENDING"));
  }

  function handleStop() {
    stopRequestedRef.current = true;
  }

  function handleRunSingle(villaId: string) {
    const row = rows.find((item) => item.villaId === villaId);
    if (!row) return;
    void runChecks([row]);
  }

  function handleDownload() {
    if (filteredRows.length === 0) {
      window.alert("İndirilecek kayıt bulunamadı.");
      return;
    }

    const dateStamp = new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replace(/\./g, "-");

    void downloadExcel(
      filteredRows,
      `belge-kontrol-${getFilterFileSuffix(statusFilter)}-${dateStamp}.xlsx`
    );
  }

  const progressPercent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Belge Kontrol</h1>
            <p className="mt-1 text-sm text-gray-500">
              Konut Belgesi (7464 S.K.) — KTB online doğrulama
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshList}
              disabled={isLoadingList || isRunning}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingList ? "animate-spin" : ""}`}
              />
              LİSTELE
            </button>

            <button
              type="button"
              onClick={handleRunPending}
              disabled={isRunning || stats.pending === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              BEKLEYENLERİ ÇALIŞTIR
            </button>

            <button
              type="button"
              onClick={handleRunAll}
              disabled={isRunning || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              TÜMÜNÜ ÇALIŞTIR
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              EXCEL İNDİR
            </button>

            {isRunning ? (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Square className="h-4 w-4" />
                DURDUR
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 border-b border-gray-100 px-5 py-4 sm:grid-cols-4">
          <StatFilterButton
            label="Toplam"
            value="ALL"
            count={stats.total}
            active={statusFilter === "ALL"}
            onClick={setStatusFilter}
            className="bg-gray-50 text-gray-900"
            activeClassName="bg-gray-100 text-gray-900"
          />
          <StatFilterButton
            label="Geçerli"
            value="VALID"
            count={stats.valid}
            active={statusFilter === "VALID"}
            onClick={setStatusFilter}
            className="bg-emerald-50 text-emerald-800"
            activeClassName="bg-emerald-100 text-emerald-900"
          />
          <StatFilterButton
            label="Geçersiz"
            value="INVALID"
            count={stats.invalid}
            active={statusFilter === "INVALID"}
            onClick={setStatusFilter}
            className="bg-rose-50 text-rose-800"
            activeClassName="bg-rose-100 text-rose-900"
          />
          <StatFilterButton
            label="Beklemede"
            value="PENDING"
            count={stats.pending}
            active={statusFilter === "PENDING"}
            onClick={setStatusFilter}
            className="bg-amber-50 text-amber-800"
            activeClassName="bg-amber-100 text-amber-900"
          />
        </div>

        {isRunning ? (
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
              <span>Kontrol ediliyor...</span>
              <span>
                {progress.done}/{progress.total} (%{progressPercent})
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-sky-100/80 text-xs font-semibold uppercase tracking-wide text-gray-700">
              <tr>
                <th className="w-12 px-3 py-3">#</th>
                <th className="px-3 py-3">Ev Adı</th>
                <th className="px-3 py-3">Belge Sahibi</th>
                <th className="px-3 py-3">Belge No</th>
                <th className="px-3 py-3">KTB Kontrol Linki</th>
                <th className="px-3 py-3">Durum</th>
                <th className="px-3 py-3">Son Kontrol</th>
                <th className="px-3 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row, index) => (
                  <tr
                    key={row.villaId}
                    className="border-b border-gray-100 odd:bg-white even:bg-gray-50/60"
                  >
                    <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {row.villaName}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {row.documentOwnerName}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {row.documentNo}
                    </td>
                    <td className="px-3 py-3">
                      <a
                        href={row.checkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                      >
                        {row.checkUrl.replace(/^https?:\/\//i, "")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        <StatusBadge status={row.status} />
                        {row.errorMessage ? (
                          <p className="text-xs text-gray-500">{row.errorMessage}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {formatCheckedAt(row.checkedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setDocumentModal({
                              villaId: row.villaId,
                              villaName: row.villaName,
                            })
                          }
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          Belgeyi Aç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunSingle(row.villaId)}
                          disabled={isRunning}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Kontrol Et
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    {emptyFilterMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {documentModal ? (
        <VillaDocumentModal
          villaId={documentModal.villaId}
          villaName={documentModal.villaName}
          onClose={() => setDocumentModal(null)}
          onSaved={() => {
            setDocumentModal(null);
            handleRefreshList();
          }}
        />
      ) : null}
    </div>
  );
}
