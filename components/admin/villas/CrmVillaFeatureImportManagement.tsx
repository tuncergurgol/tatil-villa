"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  importCrmVillaFeaturesAction,
  previewCrmVillaFeaturesAction,
} from "@/app/actions/admin/crm-villa-feature-import";
import type { CrmVillaFeaturePreview } from "@/lib/crm-villa-feature-import";
import type { CrmVillaFeatureImportRow } from "@/lib/queries/crm-villa-feature-import";

type Notice = { type: "success" | "error"; message: string };

type BulkProgress = {
  current: number;
  total: number;
  successCount: number;
  failCount: number;
  currentName: string;
};

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR");
}

function FeatureTags({
  names,
  tone = "slate",
}: {
  names: string[];
  tone?: "slate" | "green" | "red" | "amber";
}) {
  const colors = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };

  if (names.length === 0) {
    return <span className="text-xs text-slate-400">Yok</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <span
          key={name}
          className={`rounded-full border px-2 py-1 text-[11px] font-medium ${colors[tone]}`}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export default function CrmVillaFeatureImportManagement({
  rows,
}: {
  rows: CrmVillaFeatureImportRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [selectedVilla, setSelectedVilla] =
    useState<CrmVillaFeatureImportRow | null>(null);
  const [preview, setPreview] = useState<CrmVillaFeaturePreview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || bulkProgress != null;

  const filteredRows = useMemo(() => {
    const term = normalize(query.trim());
    return rows.filter((row) => {
      if (onlyUnmatched && row.villaId != null) return false;
      if (!term) return true;
      return [row.name, row.originalName, row.slug, String(row.villaId ?? "")]
        .map(normalize)
        .some((value) => value.includes(term));
    });
  }, [onlyUnmatched, query, rows]);

  const filteredIds = useMemo(
    () => filteredRows.map((row) => row.id),
    [filteredRows]
  );
  const checkedFilteredCount = useMemo(
    () => filteredIds.filter((id) => checkedIds.has(id)).length,
    [checkedIds, filteredIds]
  );
  const allFilteredChecked =
    filteredIds.length > 0 && checkedFilteredCount === filteredIds.length;
  const someFilteredChecked =
    checkedFilteredCount > 0 && checkedFilteredCount < filteredIds.length;

  const selectedImportableRows = useMemo(
    () =>
      filteredRows.filter(
        (row) => checkedIds.has(row.id) && row.villaId != null
      ),
    [checkedIds, filteredRows]
  );

  function toggleRowChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of filteredIds) next.add(id);
      } else {
        for (const id of filteredIds) next.delete(id);
      }
      return next;
    });
  }

  function openPreview(row: CrmVillaFeatureImportRow) {
    setSelectedVilla(row);
    setPreview(null);
    setNotice(null);
    startTransition(async () => {
      const response = await previewCrmVillaFeaturesAction(row.id);
      if (!response.ok) {
        setNotice({ type: "error", message: response.error });
        return;
      }
      setPreview(response.preview);
    });
  }

  function importFeatures() {
    if (!selectedVilla || !preview) return;
    const confirmed = window.confirm(
      `${selectedVilla.name} için mevcut özellikler CRM verisiyle değiştirilecek. Devam edilsin mi?`
    );
    if (!confirmed) return;

    setNotice(null);
    startTransition(async () => {
      const response = await importCrmVillaFeaturesAction(selectedVilla.id);
      if (!response.ok) {
        setNotice({ type: "error", message: response.error });
        return;
      }
      setPreview(response.result);
      setNotice({
        type: "success",
        message: `${response.result.importedCount} özellik aktarıldı.`,
      });
      router.refresh();
    });
  }

  async function importAllSelected() {
    if (selectedImportableRows.length === 0 || isBusy) return;

    const skipped = checkedFilteredCount - selectedImportableRows.length;
    const confirmed = window.confirm(
      `${selectedImportableRows.length} villa için özellikler CRM verisiyle değiştirilecek` +
        (skipped > 0 ? ` (${skipped} villa CRM ID olmadığı için atlanacak)` : "") +
        `. Devam edilsin mi?`
    );
    if (!confirmed) return;

    setNotice(null);
    setSelectedVilla(null);
    setPreview(null);

    let successCount = 0;
    let failCount = 0;
    let importedFeatureTotal = 0;
    const failures: string[] = [];

    for (let index = 0; index < selectedImportableRows.length; index++) {
      const row = selectedImportableRows[index]!;
      setBulkProgress({
        current: index + 1,
        total: selectedImportableRows.length,
        successCount,
        failCount,
        currentName: row.name,
      });

      const response = await importCrmVillaFeaturesAction(row.id);
      if (response.ok) {
        successCount += 1;
        importedFeatureTotal += response.result.importedCount;
      } else {
        failCount += 1;
        if (failures.length < 5) {
          failures.push(`${row.name}: ${response.error}`);
        }
      }

      setBulkProgress({
        current: index + 1,
        total: selectedImportableRows.length,
        successCount,
        failCount,
        currentName: row.name,
      });
    }

    setBulkProgress(null);
    setNotice({
      type: failCount > 0 && successCount === 0 ? "error" : "success",
      message:
        `${successCount} villa aktarıldı (${importedFeatureTotal} özellik)` +
        (failCount > 0 ? `, ${failCount} villa başarısız.` : ".") +
        (failures.length > 0 ? ` Örnek: ${failures.join(" · ")}` : ""),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Özellikleri Aktar
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              CRM tesis kimliği ile villaları eşleştirir; seçilen villanın CRM
              kaydında yayınlanan özelliklerini yerel Villa Olanaklarıyla
              eşleştirerek villa bazında aktarır.
            </p>
          </div>
          <a
            href="https://crm.tatildeyiz.com.tr/tesis/tesisler"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            CRM Tesisler
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Villa adı, orijinal ad, slug veya CRM ID ara..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={onlyUnmatched}
              onChange={(event) => setOnlyUnmatched(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            Sadece eşleşmeyenler
          </label>
        </div>
      </header>

      {notice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">
            Villa Eşleştirmeleri
            {checkedIds.size > 0 ? (
              <span className="ml-2 font-medium text-sky-700">
                · {checkedIds.size} seçili
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {allFilteredChecked ? (
              <button
                type="button"
                disabled={isBusy || selectedImportableRows.length === 0}
                onClick={() => void importAllSelected()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bulkProgress ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                )}
                Tümünü Aktar ({selectedImportableRows.length})
              </button>
            ) : null}
            <span className="text-xs text-slate-500">
              {filteredRows.length} / {rows.length} villa
            </span>
          </div>
        </div>
        {bulkProgress ? (
          <div className="border-b border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                Aktarılıyor: {bulkProgress.current} / {bulkProgress.total} —{" "}
                {bulkProgress.currentName}
              </p>
              <p className="text-xs text-sky-700">
                Başarılı {bulkProgress.successCount} · Hatalı {bulkProgress.failCount}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100">
              <div
                className="h-full rounded-full bg-sky-600 transition-all"
                style={{
                  width: `${Math.round(
                    (bulkProgress.current / bulkProgress.total) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allFilteredChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredChecked;
                      }}
                      onChange={(event) =>
                        toggleAllFiltered(event.target.checked)
                      }
                      disabled={filteredIds.length === 0}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600"
                      aria-label="Tümünü seç"
                    />
                    <span className="whitespace-nowrap text-[11px] font-semibold normal-case tracking-normal text-slate-600">
                      Tümünü seç
                    </span>
                  </label>
                </th>
                <th className="px-4 py-3">Bizim sistem</th>
                <th className="px-4 py-3">CRM eşleşmesi</th>
                <th className="px-4 py-3">Mevcut özellik</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const matched = row.villaId != null;
                const isChecked = checkedIds.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/70 ${
                      isChecked ? "bg-sky-50/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRowChecked(row.id)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600"
                        aria-label={`${row.name} seç`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {row.originalName || row.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {matched ? (
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">ID {row.villaId}</span>
                          <a
                            href={`https://crm.tatildeyiz.com.tr/tesis/yeni-villa?id=${row.villaId}`}
                            target="_blank"
                            rel="noreferrer"
                            title="CRM kaydını aç"
                            className="text-slate-400 hover:text-sky-600"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-amber-700">
                          <TriangleAlert className="h-4 w-4" />
                          CRM ID yok
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.amenities.length} özellik
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={!matched || isBusy}
                        onClick={() => openPreview(row)}
                        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isPending && selectedVilla?.id === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                        )}
                        Önizle / Aktar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedVilla ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {selectedVilla.name}
                </p>
                <p className="text-xs text-slate-500">
                  CRM ID: {selectedVilla.villaId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVilla(null);
                  setPreview(null);
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {!preview && isPending ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-sky-600" />
                  CRM özellikleri okunuyor ve eşleştiriliyor...
                </div>
              ) : null}

              {preview ? (
                <>
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800">
                      Aktarılacak özellikler ({preview.matchedNames.length})
                    </h3>
                    <FeatureTags names={preview.matchedNames} tone="green" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-emerald-700">
                        Eklenecek ({preview.addedNames.length})
                      </h3>
                      <FeatureTags names={preview.addedNames} tone="green" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-red-700">
                        Kaldırılacak ({preview.removedNames.length})
                      </h3>
                      <FeatureTags names={preview.removedNames} tone="red" />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-amber-800">
                      Yerel tanımla eşleşmeyen CRM özellikleri (
                      {preview.unmatchedNames.length})
                    </h3>
                    <FeatureTags names={preview.unmatchedNames} tone="amber" />
                    {preview.unmatchedNames.length > 0 ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Bu adlar Villa Olanakları içinde tanımlı olmadığı için
                        aktarılmaz.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <a
                      href={preview.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-sky-700 hover:underline"
                    >
                      Kaynak villa sayfasını aç
                    </a>
                    <button
                      type="button"
                      disabled={isBusy || preview.matchedNames.length === 0}
                      onClick={importFeatures}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowDownToLine className="h-4 w-4" />
                      )}
                      Özellikleri İçe Aktar
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
