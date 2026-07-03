"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import {
  clearVillaIcalData,
  createVillaIcalSource,
  deleteVillaIcalSource,
  matchVillaWhatsappGroup,
  rotateVillaIcalExportUrl,
} from "@/app/actions/admin/villa-ical";
import type { VillaIcalTabData } from "@/lib/queries/villa-ical";

interface VillaIcalTabProps {
  villaId: string;
  data: VillaIcalTabData;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const labelClass = "text-xs font-medium text-gray-500";

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function VillaIcalTab({ villaId, data }: VillaIcalTabProps) {
  const router = useRouter();
  const [showAddSource, setShowAddSource] = useState(false);
  const [showSyncEvents, setShowSyncEvents] = useState(false);
  const [exportUrl, setExportUrl] = useState(data.exportUrl);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [whatsappGroupId, setWhatsappGroupId] = useState(data.whatsappGroupId);
  const [differentGroupName, setDifferentGroupName] = useState(
    data.whatsappGroupDifferentName
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setExportUrl(data.exportUrl);
  }, [data.exportUrl]);

  const isWhatsappConnected =
    data.whatsappModuleConnected && Boolean(data.whatsappGroupId);

  function refresh() {
    router.refresh();
  }

  function handleAddSource(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createVillaIcalSource(villaId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowAddSource(false);
      setSourceName("");
      setSourceUrl("");
      refresh();
    });
  }

  function handleDeleteSource(sourceId: string) {
    if (!confirm("Bu iCal kaynağını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const result = await deleteVillaIcalSource(villaId, sourceId);
      if (result.error) setError(result.error);
      else refresh();
    });
  }

  function handleClearData() {
    if (
      !confirm(
        "Tüm gelen iCal kaynakları ve senkron kayıtları silinecek. Devam edilsin mi?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await clearVillaIcalData(villaId);
      if (result.error) setError(result.error);
      else refresh();
    });
  }

  function handleRotateUrl() {
    if (
      !confirm(
        "Giden iCal URL yenilenecek. Eski URL artık çalışmayacak. Devam edilsin mi?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await rotateVillaIcalExportUrl(villaId);
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("URL kopyalanamadı");
    }
  }

  function handleMatchGroup(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await matchVillaWhatsappGroup(villaId, formData);
      if (result.error) setError(result.error);
      else refresh();
    });
  }

  function submitAddSource() {
    if (!sourceName.trim() || !sourceUrl.trim()) {
      setError("Kaynak adı ve URL gerekli");
      return;
    }
    const formData = new FormData();
    formData.set("name", sourceName.trim());
    formData.set("url", sourceUrl.trim());
    handleAddSource(formData);
  }

  function submitMatchGroup() {
    const formData = new FormData();
    formData.set("whatsappGroupId", whatsappGroupId);
    if (differentGroupName) {
      formData.set("whatsappGroupDifferentName", "on");
    }
    handleMatchGroup(formData);
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <SectionCard
        title="Gelen iCal Kaynakları"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddSource((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Kaynak Ekle
            </button>
            <button
              type="button"
              onClick={handleClearData}
              disabled={isPending}
              className="text-sm font-medium text-amber-600 transition hover:text-amber-700 disabled:opacity-50"
            >
              iCal Verilerini Temizle
            </button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-gray-500">
          Airbnb, Booking, VRBO gibi platformlardan gelen takvim bağlantılarını
          buradan yönetin.
        </p>

        {showAddSource ? (
          <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Kaynak Adı</span>
                <input
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                  placeholder="Örn: Airbnb"
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>iCal URL</span>
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  type="url"
                  placeholder="https://"
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddSource(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={submitAddSource}
                disabled={isPending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        ) : null}

        {data.sources.length > 0 ? (
          <ul className="space-y-2">
            {data.sources.map((source) => (
              <li
                key={source.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {source.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">{source.url}</p>
                  {source.lastSyncAt ? (
                    <p className="mt-1 text-xs text-gray-400">
                      Son senkron:{" "}
                      {new Date(source.lastSyncAt).toLocaleString("tr-TR")}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSource(source.id)}
                  disabled={isPending}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Sil
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Henüz kaynak eklenmemiş. Yeni Kaynak Ekle butonuna basarak başlayın.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Giden iCal URL (Airbnb / Booking / VRBO için)">
        <label className="block">
          <span className={labelClass}>Dışa aktarma bağlantısı</span>
          <input
            readOnly
            value={exportUrl}
            onChange={(event) => setExportUrl(event.target.value)}
            className={`mt-1.5 ${inputClass}`}
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
          <button
            type="button"
            onClick={handleRotateUrl}
            disabled={isPending}
            className="text-sm font-medium text-amber-600 transition hover:text-amber-700 disabled:opacity-50"
          >
            URL&apos;i Yenile (Rotate)
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowSyncEvents((value) => !value)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          {showSyncEvents ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Son senkron olayları
        </button>

        {showSyncEvents ? (
          data.syncEvents.length > 0 ? (
            <ul className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {data.syncEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 text-sm text-gray-700"
                >
                  <span>{event.message}</span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(event.createdAt).toLocaleString("tr-TR")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              Henüz senkron olayı kaydı yok.
            </p>
          )
        ) : null}
      </SectionCard>

      <SectionCard
        title="Tesis-Grup Eşleştir"
        action={
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isWhatsappConnected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {isWhatsappConnected ? "Bağlı" : "Bağlı Değil"}
          </span>
        }
      >
        {!data.whatsappModuleConnected ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            WhatsApp iCal modülüne bağlı değilsiniz. Bağlantı için{" "}
            <Link
              href="/admin/bildirimler/whatsapp"
              className="font-semibold underline"
            >
              Bildirimler → WhatsApp
            </Link>{" "}
            sayfasını ziyaret edin.
          </div>
        ) : null}

        <div className="space-y-4">
          <label className="block">
            <span className={labelClass}>WhatsApp Grubu</span>
            <select
              value={whatsappGroupId}
              onChange={(event) => setWhatsappGroupId(event.target.value)}
              disabled={!data.whatsappModuleConnected}
              className={`mt-1.5 ${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">Uygun grup yok</option>
              {data.whatsappGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={differentGroupName}
              onChange={(event) => setDifferentGroupName(event.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Grupta farklı adı var
          </label>

          <button
            type="button"
            onClick={submitMatchGroup}
            disabled={isPending || !data.whatsappModuleConnected}
            className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bu Tesisi Gruba Eşle
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
