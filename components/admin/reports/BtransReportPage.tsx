"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Download, FileWarning, Info } from "lucide-react";
import {
  BTRANS_DATE_BASIS_OPTIONS,
  type BtransDateBasis,
  type BtransIncompleteRow,
} from "@/lib/btrans-report";

type ReportResult = {
  xml: string;
  filename: string;
  count: number;
  incompleteCount: number;
  incomplete: BtransIncompleteRow[];
  warnings: string[];
};

const DATE_BASIS_HELP: Record<BtransDateBasis, string> = {
  approvedAt:
    "Onay tarihi: rezervasyon onaylandığında (Onaylandı) o tarih; henüz ayrıca onaylanmadıysa oluşturma tarihi (varsayılan).",
  createdAt: "Rezervasyonun sistemde oluşturulduğu tarih baz alınır.",
  checkIn: "Rezervasyonun giriş (check-in) tarihi baz alınır.",
};

const EXCEL_HEADERS = [
  "Rez. No",
  "Tesis",
  "İl",
  "İlçe",
  "Ev Sahibi",
  "Giriş",
  "Eksik Alanlar",
] as const;

function toMonthInputValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatCheckInDisplay(value: string) {
  if (value.length !== 8) return value;
  return `${value.slice(6, 8)}.${value.slice(4, 6)}.${value.slice(0, 4)}`;
}

function downloadXmlFile(xml: string, filename: string) {
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function downloadIncompleteExcel(
  rows: BtransIncompleteRow[],
  fileName: string
) {
  const XLSX = await import("xlsx");
  const sheetRows = [
    [...EXCEL_HEADERS],
    ...rows.map((row) => [
      row.externalCode,
      row.villaName,
      row.il,
      row.ilce,
      row.ownerName,
      formatCheckInDisplay(row.checkIn),
      row.missing.join(" / "),
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BTRANS Eksik Kayitlar");
  XLSX.writeFile(workbook, fileName);
}

export default function BtransReportPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dateBasis, setDateBasis] = useState<BtransDateBasis>("approvedAt");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMonthInputChange(value: string) {
    const [yearPart, monthPart] = value.split("-");
    const parsedYear = Number(yearPart);
    const parsedMonth = Number(monthPart);
    if (Number.isFinite(parsedYear) && Number.isFinite(parsedMonth)) {
      setYear(parsedYear);
      setMonth(parsedMonth);
    }
  }

  function handleGenerate() {
    startTransition(async () => {
      const response = await fetch("/api/admin/btrans-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, dateBasis }),
      });

      if (!response.ok) {
        window.alert("XML oluşturulamadı.");
        return;
      }

      const data = (await response.json()) as ReportResult;
      setResult(data);
      downloadXmlFile(data.xml, data.filename);
    });
  }

  function handleDownloadIncomplete() {
    if (!result || result.incomplete.length === 0) return;
    downloadIncompleteExcel(
      result.incomplete,
      `btrans-eksik-${year}-${String(month).padStart(2, "0")}.xlsx`
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            BTRANS Bildirimi (538)
          </h1>
          <p className="mt-1 flex items-start gap-2 text-sm text-gray-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            GİB (Gelir İdaresi) VUK 538 Tebliği — günübirlik konut kiralama
            aylık bildirim XML&apos;i
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 border-b border-gray-100 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Bildirim Ayı
            </span>
            <input
              type="month"
              value={toMonthInputValue(year, month)}
              onChange={(event) => handleMonthInputChange(event.target.value)}
              className="min-w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Tarih Bazı
            </span>
            <select
              value={dateBasis}
              onChange={(event) =>
                setDateBasis(event.target.value as BtransDateBasis)
              }
              className="min-w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {BTRANS_DATE_BASIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isPending ? "Oluşturuluyor…" : "XML Üret ve İndir"}
          </button>
        </div>

        <p className="border-b border-gray-100 bg-sky-50 px-5 py-3 text-sm text-sky-900">
          {DATE_BASIS_HELP[dateBasis]}
        </p>

        <p className="px-5 py-4 text-sm text-gray-600">
          Seçilen tarih bazına göre o aydaki yalnızca ONAYLI (Onaylandı)
          rezervasyonlar tek dosyada toplanır. Zorunlu alanı (IBAN, ev
          sahibi TC/VKN, cep, il/ilçe kodu) eksik olan kayıtlar dosyaya
          alınmaz; aşağıda eksikleriyle listelenir. İnen XML&apos;i GİB
          BTRANS test ekranında doğrulayıp, geçtikten sonra ziplenip
          Başkanlığa yüklenir. Bir aya ait bilgi, takip eden ayın son günü
          23:59&apos;a kadar bildirilir.
        </p>

        {result ? (
          <div className="space-y-3 border-t border-gray-100 px-5 py-4">
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              <Download className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {result.filename} indirildi — {result.count} işlem dosyaya
                alındı (GİB gunubirlikson.xsd şemasına uygun).
              </span>
            </div>
            {result.warnings.map((warning) => (
              <div
                key={warning}
                className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {result && result.incomplete.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Eksik Bilgili Rezervasyonlar ({result.incomplete.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleDownloadIncomplete}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
            >
              <Download className="h-4 w-4" />
              EXCEL İNDİR
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="bg-amber-50/80 text-xs font-semibold uppercase tracking-wide text-gray-700">
                <tr>
                  <th className="px-3 py-3">Rez. No</th>
                  <th className="px-3 py-3">Tesis</th>
                  <th className="px-3 py-3">İl / İlçe</th>
                  <th className="px-3 py-3">Ev Sahibi</th>
                  <th className="px-3 py-3">Giriş</th>
                  <th className="px-3 py-3">Eksik Alanlar</th>
                </tr>
              </thead>
              <tbody>
                {result.incomplete.map((row) => (
                  <tr
                    key={row.bookingId}
                    className="border-b border-gray-100 odd:bg-white even:bg-gray-50/60"
                  >
                    <td className="px-3 py-3 text-gray-500">
                      {row.externalCode || "-"}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {row.villaName}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {row.il || "-"} / {row.ilce || "-"}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {row.ownerName || "-"}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {formatCheckInDisplay(row.checkIn)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.missing.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {result && result.incomplete.length === 0 && result.count === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-16 text-center text-sm text-gray-500 shadow-sm">
          Seçilen ay için onaylı rezervasyon bulunamadı.
        </div>
      ) : null}
    </div>
  );
}
