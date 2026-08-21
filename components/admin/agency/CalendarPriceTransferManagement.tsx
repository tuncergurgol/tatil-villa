"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import {
  clearCalendarPriceTransferLinkAction,
  clearCalendarPriceTransferWhatsappAction,
  deletePrimaryVillaIcalSourceAction,
  saveCalendarPriceTransferAutoUpdateAction,
  saveCalendarPriceTransferLinkAction,
  saveCalendarPriceTransferWhatsappAction,
  syncSelectedVillasCalendarPriceTransferAction,
  syncVillaCalendarPriceTransferAction,
  upsertPrimaryVillaIcalSourceAction,
} from "@/app/actions/admin/calendar-price-transfer";
import {
  CALENDAR_PRICE_TRANSFER_CRITERIA,
  type CalendarPriceTransferAutoUpdateSettings,
  type CalendarPriceTransferCriterionKey,
} from "@/lib/calendar-price-transfer-auto-sync.types";
import type {
  CalendarPriceTransferRow,
  CalendarPriceTransferWhatsappGroupOption,
} from "@/lib/queries/calendar-price-transfer";
import {
  applyCalendarPriceTransferColumnFilters,
  countActiveCalendarPriceTransferFilters,
  downloadCalendarPriceTransferExcel,
  emptyCalendarPriceTransferColumnFilters,
  type CalendarPriceTransferColumnFilters,
} from "@/lib/calendar-price-transfer-filters";

type ListFilter = "all" | "updated" | "not_updated";

type EditorTarget =
  | { kind: "ical"; row: CalendarPriceTransferRow }
  | { kind: "whatsapp"; row: CalendarPriceTransferRow }
  | { kind: "link"; row: CalendarPriceTransferRow; slot: 1 | 2 | 3 };

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const filterInputClass =
  "w-full min-w-[84px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium normal-case tracking-normal text-gray-700 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100";

function ColumnFilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={filterInputClass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function formatDateTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function LinkOrEmpty({
  label,
  url,
  onOpen,
}: {
  label: string;
  url: string;
  onOpen: () => void;
}) {
  if (url.trim()) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-xs font-medium text-gray-300 hover:text-indigo-600"
      title={`${label} ekle`}
    >
      —
    </button>
  );
}

function ConnectionEditorModal({
  target,
  whatsappGroups,
  onClose,
  onSaved,
}: {
  target: EditorTarget;
  whatsappGroups: CalendarPriceTransferWhatsappGroupOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isIcal = target.kind === "ical";
  const isWhatsapp = target.kind === "whatsapp";
  const existingUrl = isIcal
    ? target.row.ical?.url ?? ""
    : isWhatsapp
      ? ""
      : target.row.links.find((l) => l.slot === target.slot)?.url ?? "";
  const [url, setUrl] = useState(existingUrl);
  const [whatsappGroupId, setWhatsappGroupId] = useState(
    isWhatsapp ? target.row.whatsapp.groupId : ""
  );
  const [differentName, setDifferentName] = useState(
    isWhatsapp ? target.row.whatsapp.differentName : false
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasExisting = isWhatsapp
    ? target.row.whatsapp.connected
    : Boolean(existingUrl.trim());

  const title = isIcal
    ? `iCal — ${target.row.name}`
    : isWhatsapp
      ? `WhatsApp — ${target.row.name}`
      : `Link ${target.slot} — ${target.row.name}`;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      let result;
      if (isIcal) {
        result = await upsertPrimaryVillaIcalSourceAction(
          target.row.id,
          url,
          target.row.ical?.id
        );
      } else if (isWhatsapp) {
        const selected = whatsappGroups.find(
          (group) => group.id === whatsappGroupId.trim()
        );
        result = await saveCalendarPriceTransferWhatsappAction(target.row.id, {
          groupId: whatsappGroupId,
          groupName: selected?.name,
          differentName,
        });
      } else {
        result = await saveCalendarPriceTransferLinkAction(
          target.row.id,
          target.slot,
          url
        );
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved(result.message || "Kaydedildi");
      onClose();
    });
  }

  function handleDelete() {
    if (!hasExisting) return;
    if (!window.confirm("Bu bağlantı silinsin mi?")) return;
    setError(null);
    startTransition(async () => {
      let result;
      if (isIcal) {
        result = await deletePrimaryVillaIcalSourceAction(
          target.row.id,
          target.row.ical!.id
        );
      } else if (isWhatsapp) {
        result = await clearCalendarPriceTransferWhatsappAction(target.row.id);
      } else {
        result = await clearCalendarPriceTransferLinkAction(
          target.row.id,
          target.slot
        );
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved(result.message || "Silindi");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {isWhatsapp ? (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  WhatsApp Grubu
                </span>
                <select
                  value={whatsappGroupId}
                  onChange={(event) => setWhatsappGroupId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Grup seçin veya aşağıya ID girin</option>
                  {whatsappGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  Grup ID (manuel)
                </span>
                <input
                  value={whatsappGroupId}
                  onChange={(event) => setWhatsappGroupId(event.target.value)}
                  placeholder="120363123456789012@g.us"
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={differentName}
                  onChange={(event) => setDifferentName(event.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Grupta farklı adı var
              </label>
            </>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                URL
              </span>
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </label>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Vazgeç
          </button>
          {hasExisting ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              Sil
            </button>
          ) : null}
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hasExisting ? "Değiştir" : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoUpdateModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: CalendarPriceTransferAutoUpdateSettings;
  onClose: () => void;
  onSaved: (
    settings: CalendarPriceTransferAutoUpdateSettings,
    message: string
  ) => void;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [period, setPeriod] = useState<"hour" | "day">(initial.period);
  const [interval, setInterval] = useState(String(initial.interval));
  const [criteria, setCriteria] = useState<Set<CalendarPriceTransferCriterionKey>>(
    new Set(initial.criteria)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleCriterion(key: CalendarPriceTransferCriterionKey) {
    setCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSave() {
    setError(null);
    const parsedInterval = Number.parseInt(interval, 10);
    if (!Number.isFinite(parsedInterval) || parsedInterval < 1 || parsedInterval > 24) {
      setError("Zaman birimi 1 ile 24 arasında olmalıdır");
      return;
    }
    if (enabled && criteria.size === 0) {
      setError("En az bir güncelleme kriteri seçin");
      return;
    }

    startTransition(async () => {
      const result = await saveCalendarPriceTransferAutoUpdateAction({
        enabled,
        period,
        interval: parsedInterval,
        criteria: [...criteria],
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved(
        {
          enabled,
          period,
          interval: parsedInterval,
          criteria: [...criteria],
          lastRunAt: initial.lastRunAt,
        },
        result.message || "Ayarlar kaydedildi"
      );
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Otomatik Güncelleme</h2>
            <p className="mt-1 text-sm text-gray-500">
              Seçilen kriterlere göre villalar periyodik güncellenir. Sunucuda{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">
                /api/cron/calendar-price-transfer
              </code>{" "}
              cron işi ve <code className="rounded bg-gray-100 px-1 text-xs">CRON_SECRET</code>{" "}
              gerekir (kurulum: <code className="text-xs">04-setup-cron.sh</code>).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            <span className="text-sm font-semibold text-gray-800">
              Otomatik güncellemeyi etkinleştir
            </span>
          </label>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">
              Güncelleme Periyodu
            </p>
            <div className="flex gap-2">
              {(
                [
                  { value: "hour", label: "Saat" },
                  { value: "day", label: "Gün" },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    period === item.value
                      ? "bg-amber-500 text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              Zaman Birimi (1–24)
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">
              Örnek: {period === "hour" ? "6 saatte bir" : "2 günde bir"}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">
              Güncelleme Kriterleri
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CALENDAR_PRICE_TRANSFER_CRITERIA.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={criteria.has(item.key)}
                    onChange={() => toggleCriterion(item.key)}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {initial.lastRunAt ? (
            <p className="text-xs text-gray-500">
              Son otomatik çalışma:{" "}
              {new Intl.DateTimeFormat("tr-TR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(initial.lastRunAt))}
            </p>
          ) : (
            <p className="text-xs text-amber-700">
              Henüz otomatik çalışma kaydı yok. Cron kurulu değilse güncelleme
              başlamaz.
            </p>
          )}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPriceTransferManagement({
  rows,
  whatsappGroups,
  autoUpdate,
}: {
  rows: CalendarPriceTransferRow[];
  whatsappGroups: CalendarPriceTransferWhatsappGroupOption[];
  autoUpdate: CalendarPriceTransferAutoUpdateSettings;
}) {
  const router = useRouter();
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [columnFilters, setColumnFilters] =
    useState<CalendarPriceTransferColumnFilters>(
      emptyCalendarPriceTransferColumnFilters
    );
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyVillaId, setBusyVillaId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [autoUpdateOpen, setAutoUpdateOpen] = useState(false);
  const [autoUpdateSettings, setAutoUpdateSettings] = useState(autoUpdate);
  const [notice, setNotice] = useState<{
    type: "ok" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const updatedCount = rows.filter((row) => row.isUpdated).length;
  const notUpdatedCount = rows.length - updatedCount;

  const filteredRows = useMemo(() => {
    let next = rows;
    if (filter === "updated") next = next.filter((row) => row.isUpdated);
    if (filter === "not_updated") next = next.filter((row) => !row.isUpdated);
    return applyCalendarPriceTransferColumnFilters(next, columnFilters);
  }, [columnFilters, filter, rows]);

  const activeColumnFilterCount = countActiveCalendarPriceTransferFilters(
    columnFilters
  );

  function updateColumnFilter<K extends keyof CalendarPriceTransferColumnFilters>(
    key: K,
    value: CalendarPriceTransferColumnFilters[K]
  ) {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearColumnFilters() {
    setColumnFilters(emptyCalendarPriceTransferColumnFilters);
  }

  async function handleExportExcel() {
    if (filteredRows.length === 0) {
      setNotice({ type: "error", message: "Dışa aktarılacak kayıt bulunamadı." });
      return;
    }
    setIsExporting(true);
    try {
      await downloadCalendarPriceTransferExcel(filteredRows);
      setNotice({
        type: "ok",
        message: `${filteredRows.length} villa Excel raporuna aktarıldı.`,
      });
    } catch {
      setNotice({
        type: "error",
        message: "Excel raporu oluşturulamadı.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  function renderColumnFilterRow() {
    return (
      <tr className="border-t border-gray-200 bg-white">
        <th className="px-3 py-2" />
        <th className="px-3 py-2">
          <div className="space-y-1.5">
            <input
              type="text"
              value={columnFilters.villaSearch}
              onChange={(event) =>
                updateColumnFilter("villaSearch", event.target.value)
              }
              placeholder="ID / ad ara"
              className={filterInputClass}
            />
            <input
              type="text"
              value={columnFilters.originalNameSearch}
              onChange={(event) =>
                updateColumnFilter("originalNameSearch", event.target.value)
              }
              placeholder="Orijinal ad ara"
              className={filterInputClass}
            />
          </div>
        </th>
        <th className="px-3 py-2">
          <input
            type="text"
            value={columnFilters.documentNoSearch}
            onChange={(event) =>
              updateColumnFilter("documentNoSearch", event.target.value)
            }
            placeholder="Belge no ara"
            className={filterInputClass}
          />
        </th>
        <th className="px-3 py-2">
          <ColumnFilterSelect
            value={columnFilters.status}
            onChange={(value) => updateColumnFilter("status", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "active", label: "Aktif" },
              { value: "passive", label: "Pasif" },
            ]}
          />
        </th>
        <th className="px-3 py-2">
          <ColumnFilterSelect
            value={columnFilters.whatsapp}
            onChange={(value) => updateColumnFilter("whatsapp", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "yes", label: "Bağlı" },
              { value: "no", label: "Bağlı değil" },
            ]}
          />
        </th>
        <th className="px-3 py-2">
          <ColumnFilterSelect
            value={columnFilters.ical}
            onChange={(value) => updateColumnFilter("ical", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "yes", label: "Tanımlı" },
              { value: "no", label: "Tanımsız" },
            ]}
          />
        </th>
        <th className="px-3 py-2">
          <ColumnFilterSelect
            value={columnFilters.link1}
            onChange={(value) => updateColumnFilter("link1", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "yes", label: "Tanımlı" },
              { value: "no", label: "Tanımsız" },
            ]}
          />
        </th>
        <th className="px-3 py-2">
          <ColumnFilterSelect
            value={columnFilters.link2}
            onChange={(value) => updateColumnFilter("link2", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "yes", label: "Tanımlı" },
              { value: "no", label: "Tanımsız" },
            ]}
          />
        </th>
        <th className="px-3 py-2">
          <ColumnFilterSelect
            value={columnFilters.link3}
            onChange={(value) => updateColumnFilter("link3", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "yes", label: "Tanımlı" },
              { value: "no", label: "Tanımsız" },
            ]}
          />
        </th>
        <th className="px-3 py-2" />
        <th className="px-3 py-2">
          <ColumnFilterSelect
            value={columnFilters.report}
            onChange={(value) => updateColumnFilter("report", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "error", label: "Hata" },
              { value: "updated", label: "Güncellendi" },
              { value: "not_updated", label: "Güncellenmedi" },
            ]}
          />
        </th>
      </tr>
    );
  }

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedIds.has(row.id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const row of filteredRows) next.delete(row.id);
      } else {
        for (const row of filteredRows) next.add(row.id);
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function refresh() {
    router.refresh();
  }

  function handleSyncOne(villaId: string) {
    setNotice(null);
    setBusyVillaId(villaId);
    startTransition(async () => {
      const result = await syncVillaCalendarPriceTransferAction(villaId);
      setBusyVillaId(null);
      refresh();
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message || result.error || "İşlem tamamlandı",
      });
    });
  }

  function handleSyncSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setNotice({ type: "error", message: "Önce villa seçin" });
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await syncSelectedVillasCalendarPriceTransferAction(ids);
      refresh();
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message || result.error || "İşlem tamamlandı",
      });
    });
  }

  function syncHorizontalScroll(source: "header" | "body") {
    const header = headerScrollRef.current;
    const body = bodyScrollRef.current;
    if (!header || !body) return;
    if (source === "header") body.scrollLeft = header.scrollLeft;
    else header.scrollLeft = body.scrollLeft;
  }

  return (
    <div className="space-y-0">
      <div className="sticky top-0 z-30 -mx-6 space-y-5 bg-[#eef0f3] px-6 pb-3 pt-0 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Takvim/Fiyat Aktarım Yönetimi
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Villa tanımındaki iCal ve Link 1–3 bağlantılarından takvim ile
              periyot fiyatlarını güncelleyin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending || selectedIds.size === 0}
              onClick={handleSyncSelected}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending && !busyVillaId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Seçilenleri Güncelle ({selectedIds.size})
            </button>
            <button
              type="button"
              disabled={isExporting || filteredRows.length === 0}
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Excel İndir ({filteredRows.length})
            </button>
            <button
              type="button"
              onClick={() => setAutoUpdateOpen(true)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                autoUpdateSettings.enabled
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
              }`}
            >
              <Clock className="h-4 w-4" />
              OTOMATİK GÜNCELLE
              {autoUpdateSettings.enabled ? " (Açık)" : ""}
            </button>
          </div>
        </div>

        {notice ? (
          <div
            className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
              notice.type === "ok"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {notice.type === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            Tümünü Seç
          </label>
          {(
            [
              { id: "all", label: `Tümü (${rows.length})` },
              { id: "updated", label: `Güncellenenler (${updatedCount})` },
              {
                id: "not_updated",
                label: `Güncellenmeyenler (${notUpdatedCount})`,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                filter === item.id
                  ? "bg-slate-900 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          {activeColumnFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearColumnFilters}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Sütun filtrelerini temizle ({activeColumnFilterCount})
            </button>
          ) : null}
          <span className="text-sm text-gray-500">
            Listelenen: {filteredRows.length}
          </span>
        </div>

        <div className="overflow-hidden rounded-t-2xl border border-b-0 border-gray-200 bg-white shadow-sm">
          <div
            ref={headerScrollRef}
            onScroll={() => syncHorizontalScroll("header")}
            className="overflow-x-auto"
          >
            <table className="min-w-[1280px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3">Seç</th>
                  <th className="px-3 py-3">Villa ID — Villa Adı</th>
                  <th className="px-3 py-3">Belge No</th>
                  <th className="px-3 py-3">Durum</th>
                  <th className="px-3 py-3">WhatsApp</th>
                  <th className="px-3 py-3">iCal</th>
                  <th className="px-3 py-3">Link 1</th>
                  <th className="px-3 py-3">Link 2</th>
                  <th className="px-3 py-3">Link 3</th>
                  <th className="px-3 py-3" />
                  <th className="px-3 py-3">Rapor</th>
                </tr>
                {renderColumnFilterRow()}
              </thead>
            </table>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-b-2xl border border-gray-200 bg-white shadow-sm">
        <div
          ref={bodyScrollRef}
          onScroll={() => syncHorizontalScroll("body")}
          className="overflow-x-auto"
        >
          <table className="min-w-[1280px] w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const link1 = row.links.find((l) => l.slot === 1);
                const link2 = row.links.find((l) => l.slot === 2);
                const link3 = row.links.find((l) => l.slot === 3);
                return (
                  <tr key={row.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-gray-900">
                        {row.villaId != null ? row.villaId : "—"} — {row.name}
                      </div>
                      {row.originalName ? (
                        <div className="mt-0.5 text-xs text-gray-500">
                          {row.originalName}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {row.documentNo || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <LinkOrEmpty
                        label="WhatsApp"
                        url={row.whatsapp.connected ? "connected" : ""}
                        onOpen={() => setEditor({ kind: "whatsapp", row })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <LinkOrEmpty
                        label="iCal"
                        url={row.ical?.url ?? ""}
                        onOpen={() => setEditor({ kind: "ical", row })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <LinkOrEmpty
                        label="Link 1"
                        url={link1?.url ?? ""}
                        onOpen={() =>
                          setEditor({ kind: "link", row, slot: 1 })
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <LinkOrEmpty
                        label="Link 2"
                        url={link2?.url ?? ""}
                        onOpen={() =>
                          setEditor({ kind: "link", row, slot: 2 })
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <LinkOrEmpty
                        label="Link 3"
                        url={link3?.url ?? ""}
                        onOpen={() =>
                          setEditor({ kind: "link", row, slot: 3 })
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSyncOne(row.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        {busyVillaId === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Güncelle
                      </button>
                    </td>
                    <td className="px-3 py-3 max-w-[280px]">
                      <div
                        className={`text-xs leading-relaxed ${
                          row.hasError ? "text-red-700" : "text-gray-600"
                        }`}
                      >
                        {row.hasError ? (
                          <>
                            <span className="font-semibold">Hata:</span>{" "}
                            {row.reportMessage}
                          </>
                        ) : (
                          <>
                            <div>{formatDateTime(row.lastSyncedAt)}</div>
                            <div className="mt-0.5 text-gray-400">
                              {row.reportMessage}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Bu filtreye uygun villa bulunamadı.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {editor ? (
        <ConnectionEditorModal
          target={editor}
          whatsappGroups={whatsappGroups}
          onClose={() => setEditor(null)}
          onSaved={(message) => {
            setNotice({ type: "ok", message });
            refresh();
          }}
        />
      ) : null}

      {autoUpdateOpen ? (
        <AutoUpdateModal
          initial={autoUpdateSettings}
          onClose={() => setAutoUpdateOpen(false)}
          onSaved={(settings, message) => {
            setAutoUpdateSettings(settings);
            setNotice({ type: "ok", message });
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
