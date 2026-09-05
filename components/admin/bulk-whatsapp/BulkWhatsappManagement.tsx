"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clock3,
  MessageSquare,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import {
  createBulkWhatsappCampaignAction,
  createBulkWhatsappTemplateAction,
  deleteBulkWhatsappTemplateAction,
  pauseBulkWhatsappCampaignAction,
  previewBulkWhatsappRecipientCountAction,
  processBulkWhatsappNextAction,
  resumeBulkWhatsappCampaignAction,
  startBulkWhatsappCampaignAction,
  stopBulkWhatsappCampaignAction,
  updateBulkWhatsappTemplateAction,
} from "@/app/actions/admin/bulk-whatsapp";
import {
  BULK_WHATSAPP_CAMPAIGN_STATUS_LABELS,
  BULK_WHATSAPP_MESSAGE_STATUS_LABELS,
  BULK_WHATSAPP_WEEKDAYS,
} from "@/lib/bulk-whatsapp";
import type { BulkWhatsappPageData } from "@/lib/queries/bulk-whatsapp";
import { formatStoredTurkishPhoneDisplay } from "@/lib/phone-utils";

type TemplateItem = BulkWhatsappPageData["templates"][number];
type ReportItem = BulkWhatsappPageData["reportMessages"][number];

interface BulkWhatsappManagementProps {
  data: BulkWhatsappPageData;
}

type SalutationMode = "NONE" | "SAYIN";
type ReportStatusFilter = ReportItem["status"] | "ALL";

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BulkWhatsappManagement({ data }: BulkWhatsappManagementProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(data.templates);
  const [activeCampaign, setActiveCampaign] = useState(data.activeCampaign);
  const [reportMessages, setReportMessages] = useState(data.reportMessages);

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    data.templates[0]?.id ?? ""
  );
  const [title, setTitle] = useState("");
  const [messageBody, setMessageBody] = useState(data.templates[0]?.body ?? "");
  const [salutation, setSalutation] = useState<SalutationMode>("NONE");
  const [appendTimestamp, setAppendTimestamp] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [tagFilterIds, setTagFilterIds] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFirstDate, setScheduleFirstDate] = useState("");
  const [scheduleFirstTime, setScheduleFirstTime] = useState("10:00");
  const [scheduleDays, setScheduleDays] = useState<string[]>([
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
  ]);
  const [scheduleStartTime, setScheduleStartTime] = useState("09:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("18:00");

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportStatusFilter>("ALL");
  const [reportTag, setReportTag] = useState("");

  const [isPending, startTransition] = useTransition();
  const processingRef = useRef(false);
  const stopProcessingRef = useRef(false);

  useEffect(() => {
    setTemplates(data.templates);
    setActiveCampaign(data.activeCampaign);
    setReportMessages(data.reportMessages);
  }, [data]);

  useEffect(() => {
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (template) {
      setMessageBody(template.body);
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    let cancelled = false;
    previewBulkWhatsappRecipientCountAction(tagFilterIds).then((result) => {
      if (!cancelled) setRecipientCount(result.count);
    });
    return () => {
      cancelled = true;
    };
  }, [tagFilterIds]);

  const filteredReport = useMemo(() => {
    return reportMessages.filter((item) => {
      const matchesStatus = reportStatus === "ALL" || item.status === reportStatus;
      const matchesTag = !reportTag || item.tagLabels.includes(reportTag);
      return matchesStatus && matchesTag;
    });
  }, [reportMessages, reportStatus, reportTag]);

  const campaignConfig = useMemo(
    () => ({
      title,
      messageBody,
      templateId: selectedTemplateId,
      salutation,
      appendTimestamp,
      intervalSeconds,
      tagFilterIds,
      scheduleEnabled,
      scheduleFirstDate,
      scheduleFirstTime,
      scheduleDays,
      scheduleStartTime,
      scheduleEndTime,
    }),
    [
      title,
      messageBody,
      selectedTemplateId,
      salutation,
      appendTimestamp,
      intervalSeconds,
      tagFilterIds,
      scheduleEnabled,
      scheduleFirstDate,
      scheduleFirstTime,
      scheduleDays,
      scheduleStartTime,
      scheduleEndTime,
    ]
  );

  const runProcessingLoop = useCallback(
    async (campaignId: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      stopProcessingRef.current = false;

      while (!stopProcessingRef.current) {
        const result = await processBulkWhatsappNextAction(campaignId);
        if (!result.ok) {
          setError(result.error ?? "Gönderim hatası");
          break;
        }

        if (result.waitingSchedule) {
          setInfo("Planlanan zaman penceresi dışında — beklemede");
          await new Promise((resolve) => setTimeout(resolve, 30_000));
          continue;
        }

        setActiveCampaign((current) =>
          current
            ? {
                ...current,
                status: result.status ?? current.status,
                sentCount: result.sentCount ?? current.sentCount,
                failedCount: result.failedCount ?? current.failedCount,
                totalCount: result.totalCount ?? current.totalCount,
              }
            : current
        );

        if (result.done) {
          setInfo("Gönderim tamamlandı");
          router.refresh();
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, result.waitMs ?? intervalSeconds * 1000)
        );
      }

      processingRef.current = false;
      router.refresh();
    },
    [intervalSeconds, router]
  );

  useEffect(() => {
    if (activeCampaign?.status === "RUNNING" && activeCampaign.id) {
      void runProcessingLoop(activeCampaign.id);
    } else {
      stopProcessingRef.current = true;
    }
  }, [activeCampaign?.id, activeCampaign?.status, runProcessingLoop]);

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateTitle("");
    setTemplateBody("");
    setTemplateModalOpen(true);
  }

  function openEditTemplate(template: TemplateItem) {
    setEditingTemplate(template);
    setTemplateTitle(template.title);
    setTemplateBody(template.body);
    setTemplateModalOpen(true);
  }

  function handleSaveTemplate() {
    setError(null);
    const formData = new FormData();
    if (editingTemplate) formData.set("id", editingTemplate.id);
    formData.set("title", templateTitle);
    formData.set("body", templateBody);

    startTransition(async () => {
      const result = editingTemplate
        ? await updateBulkWhatsappTemplateAction(formData)
        : await createBulkWhatsappTemplateAction(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setTemplateModalOpen(false);
      router.refresh();
    });
  }

  function handleDeleteTemplate(template: TemplateItem) {
    if (!window.confirm(`"${template.title}" şablonu silinsin mi?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBulkWhatsappTemplateAction(template.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleTagFilter(tagId: string) {
    setTagFilterIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
  }

  function toggleScheduleDay(dayId: string) {
    setScheduleDays((current) =>
      current.includes(dayId)
        ? current.filter((id) => id !== dayId)
        : [...current, dayId]
    );
  }

  function handleCreateAndStart(startImmediately: boolean) {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const created = await createBulkWhatsappCampaignAction(campaignConfig);
      if (created.error || !created.campaignId) {
        setError(created.error ?? "Kampanya oluşturulamadı");
        return;
      }

      if (startImmediately && !scheduleEnabled) {
        await startBulkWhatsappCampaignAction(created.campaignId);
      }

      setActiveCampaign({
        id: created.campaignId,
        title: campaignConfig.title || "Toplu WhatsApp",
        messageBody: campaignConfig.messageBody,
        salutation: campaignConfig.salutation,
        appendTimestamp: campaignConfig.appendTimestamp,
        intervalSeconds: campaignConfig.intervalSeconds,
        status: startImmediately && !scheduleEnabled ? "RUNNING" : created.status ?? "DRAFT",
        tagFilterIds: campaignConfig.tagFilterIds,
        scheduleEnabled: campaignConfig.scheduleEnabled,
        scheduleFirstDate: campaignConfig.scheduleFirstDate
          ? new Date(campaignConfig.scheduleFirstDate)
          : null,
        scheduleFirstTime: campaignConfig.scheduleFirstTime,
        scheduleDays: campaignConfig.scheduleDays,
        scheduleStartTime: campaignConfig.scheduleStartTime,
        scheduleEndTime: campaignConfig.scheduleEndTime,
        totalCount: recipientCount ?? 0,
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date(),
      });

      setInfo(
        scheduleEnabled && !startImmediately
          ? "Kampanya planlandı — zaman penceresinde otomatik başlayacak"
          : "Gönderim başlatıldı"
      );
      router.refresh();
    });
  }

  function handlePause() {
    if (!activeCampaign) return;
    stopProcessingRef.current = true;
    startTransition(async () => {
      await pauseBulkWhatsappCampaignAction(activeCampaign.id);
      setActiveCampaign({ ...activeCampaign, status: "PAUSED" });
      router.refresh();
    });
  }

  function handleResume() {
    if (!activeCampaign) return;
    startTransition(async () => {
      await resumeBulkWhatsappCampaignAction(activeCampaign.id);
      setActiveCampaign({ ...activeCampaign, status: "RUNNING" });
      router.refresh();
    });
  }

  function handleStop() {
    if (!activeCampaign) return;
    stopProcessingRef.current = true;
    startTransition(async () => {
      await stopBulkWhatsappCampaignAction(activeCampaign.id);
      setActiveCampaign({ ...activeCampaign, status: "STOPPED" });
      router.refresh();
    });
  }

  const canControl =
    activeCampaign &&
    ["RUNNING", "PAUSED", "SCHEDULED", "DRAFT"].includes(activeCampaign.status);

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Toplu Mesaj (WhatsApp)</h1>
            <p className="text-sm text-gray-500">
              WAHA bildirim hattı ile müşterilere toplu WhatsApp gönderimi
            </p>
          </div>
        </div>
      </div>

      {(error || info) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error ?? info}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Mesaj Şablonları</h2>
            <p className="text-xs text-gray-500">Son eklenen en üstte</p>
          </div>
          <button
            type="button"
            onClick={openCreateTemplate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Ekle
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {templates.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">Henüz şablon yok</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{template.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{template.body}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDateTime(template.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setMessageBody(template.body);
                      setTitle(template.title);
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Seç
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditTemplate(template)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template)}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Gönderim Ayarları</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Kampanya başlığı</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Şablon</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
              >
                <option value="">Özel mesaj</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Mesaj</span>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
                placeholder="##MÜŞTERİADI-SOYADI## değişkeni kullanılabilir"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Hitap</span>
                <select
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value as SalutationMode)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                >
                  <option value="NONE">Yok</option>
                  <option value="SAYIN">Sayın,</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={appendTimestamp}
                  onChange={(e) => setAppendTimestamp(e.target.checked)}
                />
                Zaman damgası ekle
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                Mesaj gönderim aralığı (saniye)
              </span>
              <input
                type="number"
                min={1}
                max={3600}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value) || 5)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Müşteri etiket filtresi</p>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag) => (
                  <label
                    key={tag.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                      tagFilterIds.includes(tag.id)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={tagFilterIds.includes(tag.id)}
                      onChange={() => toggleTagFilter(tag.id)}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Hedef müşteri: {recipientCount ?? "…"} kişi
                {tagFilterIds.length === 0 ? " (tüm aktif telefonlu müşteriler)" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Otomatik Gönderim Planlaması</h2>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              Planlamayı etkinleştir
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">İlk gönderim tarihi</span>
                <input
                  type="date"
                  value={scheduleFirstDate}
                  onChange={(e) => setScheduleFirstDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">İlk gönderim saati</span>
                <input
                  type="time"
                  value={scheduleFirstTime}
                  onChange={(e) => setScheduleFirstTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Başlama</span>
                <input
                  type="time"
                  value={scheduleStartTime}
                  onChange={(e) => setScheduleStartTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Bitiş</span>
                <input
                  type="time"
                  value={scheduleEndTime}
                  onChange={(e) => setScheduleEndTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {BULK_WHATSAPP_WEEKDAYS.map((day) => (
                <label
                  key={day.id}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    scheduleDays.includes(day.id)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={scheduleDays.includes(day.id)}
                    onChange={() => toggleScheduleDay(day.id)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">Gönderim Kontrolü</h2>
            {activeCampaign ? (
              <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{activeCampaign.title}</p>
                <p className="mt-1">
                  Durum:{" "}
                  {BULK_WHATSAPP_CAMPAIGN_STATUS_LABELS[activeCampaign.status]}
                </p>
                <p>
                  İlerleme: {activeCampaign.sentCount}/{activeCampaign.totalCount} gönderildi,{" "}
                  {activeCampaign.failedCount} hatalı
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Aktif kampanya yok</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleCreateAndStart(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Gönder
              </button>
              {scheduleEnabled ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleCreateAndStart(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Planla
                </button>
              ) : null}
              <button
                type="button"
                disabled={!canControl || activeCampaign?.status !== "RUNNING" || isPending}
                onClick={handlePause}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-60"
              >
                <Pause className="h-4 w-4" />
                Duraklat
              </button>
              <button
                type="button"
                disabled={!canControl || activeCampaign?.status !== "PAUSED" || isPending}
                onClick={handleResume}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                Devam
              </button>
              <button
                type="button"
                disabled={!canControl || isPending}
                onClick={handleStop}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                <Square className="h-4 w-4" />
                Dur
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Gönderim Raporu</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <select
              value={reportStatus}
              onChange={(e) => setReportStatus(e.target.value as ReportStatusFilter)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="ALL">Tüm durumlar</option>
              <option value="PENDING">Beklemede</option>
              <option value="SENDING">Gönderiliyor</option>
              <option value="SENT">Gönderildi</option>
              <option value="FAILED">Hatalı</option>
              <option value="CANCELLED">İptal</option>
            </select>
            <select
              value={reportTag}
              onChange={(e) => setReportTag(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Tüm etiketler</option>
              {data.tags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Etiketler</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Kampanya</th>
                <th className="px-4 py-3">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReport.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Kayıt yok
                  </td>
                </tr>
              ) : (
                filteredReport.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.customerName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatStoredTurkishPhoneDisplay(item.phone)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.tagLabels.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {BULK_WHATSAPP_MESSAGE_STATUS_LABELS[item.status]}
                      {item.status === "FAILED" && item.errorMessage
                        ? ` (${item.errorMessage})`
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.campaign.title}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDateTime(item.sentAt ?? item.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {templateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingTemplate ? "Şablonu Düzelt" : "Yeni Şablon"}
            </h3>
            <div className="mt-4 space-y-3">
              <input
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="Başlık"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
              />
              <textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={8}
                placeholder="Mesaj"
                className="w-full rounded-xl border border-gray-200 px-3 py-2"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveTemplate}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
