"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Link2, XCircle } from "lucide-react";
import { setupVillaFromExternalUrlAction } from "@/app/actions/admin/external-villa-setup";

export default function ExternalVillaSetupForm() {
  const [pageUrl, setPageUrl] = useState("");
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { type: "error"; message: string }
    | {
        type: "success";
        created: boolean;
        name: string;
        editPath: string;
        imageCount: number;
        distanceCount: number;
        periodCount: number;
        bookedDays: number;
        optionDays: number;
        documentNo: string;
        link1: string;
        published: boolean;
        warnings: string[];
      }
    | null
  >(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const response = await setupVillaFromExternalUrlAction(pageUrl, name);
      if (!response.success) {
        setResult({ type: "error", message: response.error });
        return;
      }
      setResult({
        type: "success",
        created: response.created,
        name: response.name,
        editPath: response.editPath,
        imageCount: response.imageCount,
        distanceCount: response.distanceCount,
        periodCount: response.periodCount,
        bookedDays: response.bookedDays,
        optionDays: response.optionDays,
        documentNo: response.documentNo,
        link1: response.link1,
        published: response.published,
        warnings: response.warnings,
      });
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dış Siteden Kur
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Acente villa sayfasının bağlantısını yapıştırın. BONT adı, fotoğrafları,
          belge no, konum, mesafeler, fiyat ve müsaitlik takvimini okuyup villayı
          LINK1 ile kaydeder ve yayına alır.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-800">Kaynak bağlantı</span>
          <input
            required
            type="url"
            value={pageUrl}
            onChange={(event) => setPageUrl(event.target.value)}
            placeholder="https://www.villareyonu.com/villa-ornek"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-800">
            Villa adı <span className="font-normal text-slate-500">(isteğe bağlı)</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Boş bırakılırsa kaynaktaki ad kullanılır"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {isPending ? "Kurulum yapılıyor…" : "Kurulumu başlat"}
        </button>
        <p className="text-xs text-slate-500">
          İlk kurulum birkaç dakika sürebilir (görseller indirilir, takvim okunur).
          Şu an tam kurulum villareyonu.com için aktiftir; fiyat/takvim diğer
          desteklenen acente sitelerinde de çalışır.
        </p>
      </form>

      {result?.type === "error" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{result.message}</p>
        </div>
      ) : null}

      {result?.type === "success" ? (
        <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
          <div className="flex items-start gap-3 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold">
                {result.created ? "Villa oluşturuldu" : "Mevcut villa güncellendi"}:{" "}
                {result.name}
              </p>
              <p className="mt-1 text-emerald-800/80">
                Belge no: {result.documentNo || "—"} · LINK1 kaydedildi
                {result.published ? " · Yayında" : ""}
              </p>
            </div>
          </div>
          <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li>Fotoğraf: {result.imageCount}</li>
            <li>Mesafe: {result.distanceCount}</li>
            <li>Fiyat dönemi: {result.periodCount}</li>
            <li>
              Takvim: {result.bookedDays} dolu / {result.optionDays} opsiyon
            </li>
          </ul>
          <p className="break-all text-xs text-slate-500">{result.link1}</p>
          {result.warnings.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <Link
            href={result.editPath}
            className="inline-flex text-sm font-semibold text-teal-700 hover:underline"
          >
            Villayı düzenle
          </Link>
        </div>
      ) : null}
    </div>
  );
}
