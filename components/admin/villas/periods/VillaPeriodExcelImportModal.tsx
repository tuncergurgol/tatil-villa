"use client";

import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import {
  importVillaPricePeriodsFromExcel,
  type VillaPeriodExcelImportRow,
} from "@/app/actions/admin/villa-periods";

type SheetValue = string | number | boolean | Date | null | undefined;
type SheetRow = Record<string, SheetValue>;

interface VillaPeriodExcelImportModalProps {
  open: boolean;
  villaId: string;
  onClose: () => void;
  onImported: (count: number) => void;
}

const HEADER_ALIASES = {
  startDate: ["baslangic", "baslangic tarihi", "ilk tarih", "start date"],
  endDate: ["bitis", "bitis tarihi", "son tarih", "end date"],
  nightlyPrice: ["fiyat", "gecelik fiyat", "gunluk fiyat", "nightly price"],
  nightlyPriceCurrency: ["para birimi", "doviz", "currency"],
  prepaymentRate: ["on odeme", "on odeme %", "on odeme orani"],
  commissionRate: ["komisyon", "komisyon %", "komisyon orani"],
  minStayNights: ["min gece", "minimum gece", "minimum konaklama"],
  cleaningDayCount: ["temizlik gun", "temizlik gunu", "temizlik gun sayisi"],
  cleaningFee: ["temizlik bedeli", "temizlik ucreti"],
  damageDeposit: ["hasar depozitosu", "hasar depozito", "depozito"],
  weekendPrice: ["haftasonu fiyati", "hafta sonu fiyati", "weekend price"],
  weekendDays: ["haftasonu gunleri", "hafta sonu gunleri", "weekend days"],
  weekendMinStayNights: [
    "haftasonu min gece",
    "hafta sonu min gece",
    "weekend min nights",
  ],
} as const;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[().:_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCell(row: SheetRow, aliases: readonly string[]) {
  const entry = Object.entries(row).find(([header]) =>
    aliases.includes(normalizeHeader(header))
  );
  return entry?.[1];
}

function parseAmount(value: SheetValue): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/₺|TL|TRY/gi, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: SheetValue): number | null {
  const parsed = parseAmount(value);
  return parsed == null ? null : Math.round(parsed);
}

function excelSerialToDate(serial: number): Date {
  const excelEpoch = Date.UTC(1899, 11, 30);
  return new Date(excelEpoch + Math.round(serial) * 86_400_000);
}

function formatDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: SheetValue): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateKey(value);
  }
  if (typeof value === "number" && value > 1) {
    return formatDateKey(excelSerialToDate(value));
  }
  if (value == null) return null;

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]!.padStart(2, "0")}-${isoMatch[3]!.padStart(2, "0")}`;
  }
  const trMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (trMatch) {
    return `${trMatch[3]}-${trMatch[2]!.padStart(2, "0")}-${trMatch[1]!.padStart(2, "0")}`;
  }
  return null;
}

function parseCurrency(value: SheetValue): "TL" | "EUR" | "USD" | "GBP" {
  const normalized = String(value ?? "TL").trim().toUpperCase();
  if (normalized === "TRY" || normalized === "₺") return "TL";
  return ["TL", "EUR", "USD", "GBP"].includes(normalized)
    ? (normalized as "TL" | "EUR" | "USD" | "GBP")
    : "TL";
}

function parseWeekendDays(value: SheetValue): number[] {
  if (value == null || value === "") return [];
  const dayMap: Record<string, number> = {
    pazar: 0,
    pazartesi: 1,
    sali: 2,
    carsamba: 3,
    persembe: 4,
    cuma: 5,
    cumartesi: 6,
  };
  return [
    ...new Set(
      String(value)
        .split(/[,;/]+/)
        .map((part) => normalizeHeader(part))
        .map((part) => {
          const numeric = Number(part);
          if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 6) {
            return numeric;
          }
          return dayMap[part];
        })
        .filter((day): day is number => day != null)
    ),
  ];
}

function parseSheetRows(rows: SheetRow[]) {
  const parsed: VillaPeriodExcelImportRow[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const startDate = parseDate(findCell(row, HEADER_ALIASES.startDate));
    const endDate = parseDate(findCell(row, HEADER_ALIASES.endDate));
    const nightlyPrice = parseInteger(
      findCell(row, HEADER_ALIASES.nightlyPrice)
    );

    if (!startDate && !endDate && nightlyPrice == null) return;
    if (!startDate || !endDate || nightlyPrice == null || nightlyPrice <= 0) {
      errors.push(
        `${rowNumber}. satırda Başlangıç, Bitiş veya Fiyat bilgisi geçersiz.`
      );
      return;
    }

    parsed.push({
      startDate,
      endDate,
      nightlyPrice,
      nightlyPriceCurrency: parseCurrency(
        findCell(row, HEADER_ALIASES.nightlyPriceCurrency)
      ),
      prepaymentRate: parseInteger(
        findCell(row, HEADER_ALIASES.prepaymentRate)
      ),
      commissionRate: parseInteger(
        findCell(row, HEADER_ALIASES.commissionRate)
      ),
      minStayNights: parseInteger(
        findCell(row, HEADER_ALIASES.minStayNights)
      ),
      cleaningDayCount: parseInteger(
        findCell(row, HEADER_ALIASES.cleaningDayCount)
      ),
      cleaningFee: parseInteger(findCell(row, HEADER_ALIASES.cleaningFee)),
      damageDeposit: parseInteger(
        findCell(row, HEADER_ALIASES.damageDeposit)
      ),
      weekendPrice: parseInteger(findCell(row, HEADER_ALIASES.weekendPrice)),
      weekendDays: parseWeekendDays(
        findCell(row, HEADER_ALIASES.weekendDays)
      ),
      weekendMinStayNights: parseInteger(
        findCell(row, HEADER_ALIASES.weekendMinStayNights)
      ),
    });
  });

  return { parsed, errors };
}

export default function VillaPeriodExcelImportModal({
  open,
  villaId,
  onClose,
  onImported,
}: VillaPeriodExcelImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<VillaPeriodExcelImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setRows([]);
    setFileName(file.name);

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = firstSheetName
        ? workbook.Sheets[firstSheetName]
        : undefined;
      if (!worksheet) {
        setError("Excel dosyasında çalışma sayfası bulunamadı.");
        return;
      }
      const sheetRows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
        defval: null,
        raw: true,
      });
      const result = parseSheetRows(sheetRows);
      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 4).join(" "));
        return;
      }
      if (result.parsed.length === 0) {
        setError("Aktarılabilir periyot bulunamadı.");
        return;
      }
      setRows(result.parsed);
    } catch {
      setError("Excel dosyası okunamadı. .xlsx veya .xls dosyası seçin.");
    }
  }

  function handleImport() {
    if (rows.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await importVillaPricePeriodsFromExcel(villaId, rows);
      if (!result.success) {
        setError(result.error ?? "Excel içeri aktarılamadı.");
        return;
      }
      onImported(result.importedCount ?? rows.length);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Excel&apos;den İçeri Al
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Fiyat periyotlarını Excel dosyasından toplu ekleyin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 px-6 py-8 text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-8 w-8" />
            <span className="text-left">
              <span className="block font-semibold">
                {fileName || "Excel dosyası seçin"}
              </span>
              <span className="mt-0.5 block text-xs text-emerald-700">
                .xlsx veya .xls
              </span>
            </span>
          </button>

          <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
            <span className="font-semibold text-gray-800">Zorunlu sütunlar:</span>{" "}
            Başlangıç, Bitiş, Fiyat. İsteğe bağlı: Para Birimi, Ön Ödeme %,
            Komisyon %, Min Gece, Temizlik Gün, Temizlik Bedeli, Hasar
            Depozitosu, Haftasonu Fiyatı ve Haftasonu Günleri.
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                {rows.length} periyot içeri aktarılmaya hazır
              </div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Başlangıç</th>
                      <th className="px-4 py-2">Bitiş</th>
                      <th className="px-4 py-2">Fiyat</th>
                      <th className="px-4 py-2">Komisyon</th>
                      <th className="px-4 py-2">Min. Gece</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, index) => (
                      <tr
                        key={`${row.startDate}-${row.endDate}-${index}`}
                        className="border-t border-gray-100"
                      >
                        <td className="px-4 py-2">{row.startDate}</td>
                        <td className="px-4 py-2">{row.endDate}</td>
                        <td className="px-4 py-2 font-semibold">
                          {row.nightlyPrice.toLocaleString("tr-TR")}{" "}
                          {row.nightlyPriceCurrency}
                        </td>
                        <td className="px-4 py-2">
                          {row.commissionRate ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          {row.minStayNights ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isPending || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isPending ? "Aktarılıyor..." : `${rows.length} Periyodu İçeri Al`}
          </button>
        </div>
      </div>
    </div>
  );
}
