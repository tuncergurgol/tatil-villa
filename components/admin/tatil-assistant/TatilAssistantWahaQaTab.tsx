"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import {
  startTatilAssistantWahaQaSyncAction,
  syncTatilAssistantWahaQaBatchAction,
  toggleTatilAssistantWahaQaImportAction,
} from "@/app/actions/admin/tatil-assistant";

const BATCH_SIZE = 8;
const QUESTION_HINT_RE =
  /\b(hangi|kaç|kac|nerede|neresi|adınız|adiniz|isminiz|telefon|tarih|kişi|kisi|bölge|bolge|öğrenebilir|ogrenebilir|istiyor|bakar mısın|bakar misin|uygun|müsait|musait)\b/i;

function answerLooksLikeQuestion(text: string) {
  return text.includes("?") || QUESTION_HINT_RE.test(text);
}

export type WahaQaItem = {
  id: string;
  question: string;
  answer: string;
  occurrenceCount: number;
  sampleChatName: string;
  lastSeenAt: Date | string;
  importedExampleId: number | null;
};

type TatilAssistantWahaQaTabProps = {
  items: WahaQaItem[];
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100";

export default function TatilAssistantWahaQaTab({
  items,
}: TatilAssistantWahaQaTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [onlyRepeated, setOnlyRepeated] = useState(false);
  const [onlyImported, setOnlyImported] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return items.filter((item) => {
      if (onlyRepeated && item.occurrenceCount < 2) return false;
      if (onlyImported && !item.importedExampleId) return false;
      if (!needle) return true;
      return (
        item.question.toLocaleLowerCase("tr-TR").includes(needle) ||
        item.answer.toLocaleLowerCase("tr-TR").includes(needle) ||
        item.sampleChatName.toLocaleLowerCase("tr-TR").includes(needle)
      );
    });
  }, [items, query, onlyRepeated, onlyImported]);

  const importedCount = items.filter((item) => item.importedExampleId).length;
  const repeatedCount = items.filter((item) => item.occurrenceCount > 1).length;

  const runSync = () => {
    setError(null);
    setMessage(null);
    setSyncing(true);
    setProcessed(0);
    setTotal(0);

    startTransition(async () => {
      const started = await startTatilAssistantWahaQaSyncAction();
      if (!started.success) {
        setError(started.error ?? "WAHA sohbetleri alınamadı");
        setSyncing(false);
        return;
      }

      setTotal(started.total ?? started.chats.length);
      if (started.chats.length === 0) {
        setMessage("Taranacak bireysel sohbet bulunamadı.");
        setSyncing(false);
        return;
      }

      let offset = 0;
      let uniqueCount = 0;
      while (offset < started.chats.length) {
        const batch = started.chats.slice(offset, offset + BATCH_SIZE);
        const result = await syncTatilAssistantWahaQaBatchAction({
          syncId: started.syncId,
          chats: batch,
        });
        if (!result.success) {
          setError(result.error);
          setSyncing(false);
          return;
        }
        offset += batch.length;
        setProcessed(result.processed ?? offset);
        setTotal(result.total ?? started.chats.length);
        if (result.done) uniqueCount = result.uniqueCount ?? 0;
      }

      setMessage(
        `${started.chats.length} sohbet tarandı. ${uniqueCount} benzersiz soru-cevap birleştirildi.`
      );
      setSyncing(false);
      router.refresh();
    });
  };

  const toggleImport = (id: string, imported: boolean) => {
    startTransition(async () => {
      const result = await toggleTatilAssistantWahaQaImportAction(id, imported);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-100 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              YumYum Tatil Asistanına mesaj soru ve cevapları
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              Bildirim WhatsApp (WAHA) konuşmalarındaki müşteri talepleri ve
              verdiğimiz cevaplar taranır. Aynı metinler birleştirilir. Kutucuğu
              işaretlediğiniz çift, Mesaj Örnekleri sekmesine aktarılır.
            </p>
          </div>
          <button
            type="button"
            onClick={runSync}
            disabled={syncing || isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Taranıyor..." : "WAHA konuşmalarını tara"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold">
            {items.length} benzersiz çift
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
            {repeatedCount} tekrarlayan
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
            {importedCount} mesaj örneklerine aktarıldı
          </span>
        </div>

        {syncing ? (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{
                  width: `${total ? Math.min(100, Math.round((processed / total) * 100)) : 5}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {processed} / {total} sohbet tarandı
            </p>
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 text-sm text-emerald-700">{message}</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Soru, cevap veya sohbet ara"
            className={`${inputClass} pl-9`}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyRepeated}
            onChange={(event) => setOnlyRepeated(event.target.checked)}
          />
          Yalnızca birleşen tekrarlar
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyImported}
            onChange={(event) => setOnlyImported(event.target.checked)}
          />
          Aktarılanlar
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          {items.length === 0
            ? "Henüz kayıt yok. WAHA konuşmalarını tarayın."
            : "Filtrelere uyan soru-cevap bulunamadı."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const imported = Boolean(item.importedExampleId);
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      checked={imported}
                      disabled={isPending || syncing}
                      onChange={(event) =>
                        toggleImport(item.id, event.target.checked)
                      }
                    />
                    Mesaj Örneklerine aktar
                  </label>
                  {item.occurrenceCount > 1 ? (
                    <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {item.occurrenceCount} kez görüldü
                    </span>
                  ) : null}
                  {answerLooksLikeQuestion(item.answer) ? (
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                      Sorduğumuz soru
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      Müşteri talebi
                    </span>
                  )}
                  {item.sampleChatName ? (
                    <span className="text-xs text-gray-500">
                      {item.sampleChatName}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Müşteri
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-gray-900">
                      {item.question}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Verdiğimiz cevap
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
