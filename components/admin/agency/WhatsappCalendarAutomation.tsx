"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  createWhatsappCalendarGroup,
  createWhatsappCalendarDateTrainingAction,
  createWhatsappCalendarPhraseRule,
  deleteWhatsappCalendarDateTrainingAction,
  deleteWhatsappCalendarGroup,
  deleteWhatsappCalendarPhraseRule,
  generateWhatsappCalendarWebhookSecretAction,
  listEvolutionWhatsappGroupsAction,
  retryWhatsappCalendarMessageAction,
  saveWhatsappCalendarSettings,
  testWhatsappCalendarParserAction,
  toggleWhatsappCalendarDateTrainingAction,
  toggleWhatsappCalendarPhraseRule,
} from "@/app/actions/admin/whatsapp-calendar";
import { formatDateTrainingLine } from "@/lib/whatsapp-calendar-date-training";
import type { WhatsappCalendarAdminData } from "@/lib/queries/whatsapp-calendar";
import type { EvolutionWhatsappGroup } from "@/lib/evolution-client";
import { includesSearchText } from "@/lib/search-text";
import { WHATSAPP_CALENDAR_INTENT_LABELS } from "@/lib/whatsapp-calendar-parser";
import type { WhatsappCalendarPhraseIntent } from "@prisma/client";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function canonicalWhatsappGroupId(value: string) {
  const trimmed = value.trim();
  return trimmed.endsWith("@g.us") ? trimmed : `${trimmed}@g.us`;
}

function formatVillaOptionLabel(villa: {
  name: string;
  originalName: string;
  villaId: number | null;
}) {
  const original = villa.originalName.trim();
  const base = original ? `${villa.name} (${original})` : villa.name;
  return `#${villa.villaId ?? "-"} - ${base}`;
}

function matchesVillaPickerSearch(
  villa: {
    name: string;
    originalName: string;
    documentNo: string;
  },
  query: string
) {
  return [villa.name, villa.originalName, villa.documentNo].some((value) =>
    includesSearchText(value, query)
  );
}

export default function WhatsappCalendarAutomation({
  data,
  webhookUrl,
  connectionPanel,
}: {
  data: WhatsappCalendarAdminData;
  webhookUrl: string;
  connectionPanel: ReactNode;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(data.enabled);
  const [webhookSecret, setWebhookSecret] = useState(data.webhookSecret);
  const [groupName, setGroupName] = useState("");
  const [groupExternalId, setGroupExternalId] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const groupPickerRef = useRef<HTMLDivElement | null>(null);
  const [selectedVillaId, setSelectedVillaId] = useState("");
  const [villaSearch, setVillaSearch] = useState("");
  const [villaPickerOpen, setVillaPickerOpen] = useState(false);
  const villaPickerRef = useRef<HTMLDivElement | null>(null);
  const [liveGroups, setLiveGroups] = useState<EvolutionWhatsappGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState("15-20 Temmuz dolu");
  const [phraseText, setPhraseText] = useState("");
  const [dateTrainingLine, setDateTrainingLine] = useState(
    "1-8 ağaustos ==> 01.08.2026 - 08.08.2026"
  );
  const [phraseIntent, setPhraseIntent] =
    useState<WhatsappCalendarPhraseIntent>("CLOSE");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; message: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const mappedCount = data.mappedVillas.length;
  const appliedCount = useMemo(
    () => data.messages.filter((item) => item.status === "APPLIED").length,
    [data.messages]
  );
  const groupVillaNames = useMemo(() => {
    const namesByGroupId = new Map<string, string[]>();

    for (const villa of data.mappedVillas) {
      const groupId = canonicalWhatsappGroupId(villa.whatsappGroupId);
      const villaLabel = formatVillaOptionLabel(villa);
      namesByGroupId.set(groupId, [
        ...(namesByGroupId.get(groupId) ?? []),
        villaLabel,
      ]);
    }

    return namesByGroupId;
  }, [data.mappedVillas]);

  const matchedGroupIds = useMemo(
    () => new Set(groupVillaNames.keys()),
    [groupVillaNames]
  );

  const selectedLiveGroup = useMemo(
    () => liveGroups.find((group) => group.id === groupExternalId) ?? null,
    [liveGroups, groupExternalId]
  );

  const filteredLiveGroups = useMemo(() => {
    const query = groupSearch.trim();
    if (!query) return liveGroups;
    return liveGroups.filter(
      (group) =>
        includesSearchText(group.name, query) ||
        includesSearchText(group.id, query)
    );
  }, [liveGroups, groupSearch]);

  const selectedVilla = useMemo(
    () => data.villas.find((villa) => villa.id === selectedVillaId) ?? null,
    [data.villas, selectedVillaId]
  );

  const filteredVillas = useMemo(
    () =>
      data.villas.filter((villa) => matchesVillaPickerSearch(villa, villaSearch)),
    [data.villas, villaSearch]
  );

  useEffect(() => {
    if (!villaPickerOpen && !groupPickerOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        villaPickerOpen &&
        villaPickerRef.current &&
        !villaPickerRef.current.contains(target)
      ) {
        setVillaPickerOpen(false);
      }
      if (
        groupPickerOpen &&
        groupPickerRef.current &&
        !groupPickerRef.current.contains(target)
      ) {
        setGroupPickerOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [villaPickerOpen, groupPickerOpen]);

  async function loadLiveGroups() {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const result = await listEvolutionWhatsappGroupsAction();
      if (result.error) {
        setGroupsError(result.error);
        setLiveGroups([]);
        return;
      }
      setLiveGroups(result.groups ?? []);
    } catch (error) {
      setGroupsError(
        error instanceof Error ? error.message : "Gruplar yüklenemedi"
      );
      setLiveGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadLiveGroups();
    }, 0);

    const handleConnected = () => {
      void loadLiveGroups();
    };
    window.addEventListener("takvim-whatsapp-connected", handleConnected);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("takvim-whatsapp-connected", handleConnected);
    };
  }, []);

  useEffect(() => {
    const messageRefreshTimer = window.setInterval(() => {
      router.refresh();
    }, 60_000);

    return () => window.clearInterval(messageRefreshTimer);
  }, [router]);

  function handleSelectLiveGroup(groupId: string) {
    const selected = liveGroups.find((group) => group.id === groupId);
    if (!selected) {
      setGroupName("");
      setGroupExternalId("");
      return;
    }
    setGroupName(selected.name);
    setGroupExternalId(selected.id);
    setGroupSearch("");
    setGroupPickerOpen(false);
  }

  function handleSaveSettings() {
    setNotice(null);
    const formData = new FormData();
    if (enabled) formData.set("whatsappCalendarEnabled", "on");
    formData.set("whatsappCalendarWebhookSecret", webhookSecret);
    startTransition(async () => {
      const result = await saveWhatsappCalendarSettings({}, formData);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message ?? result.error ?? "Kayıt başarısız",
      });
      if (result.success) router.refresh();
    });
  }

  function handleGenerateSecret() {
    setNotice(null);
    startTransition(async () => {
      const result = await generateWhatsappCalendarWebhookSecretAction();
      if (result.message && result.success) {
        setWebhookSecret(result.message);
        setNotice({ type: "ok", message: "Yeni webhook anahtarı oluşturuldu" });
      } else {
        setNotice({ type: "error", message: result.error ?? "Anahtar oluşturulamadı" });
      }
    });
  }

  function handleCreateGroup() {
    setNotice(null);
    if (!selectedVillaId) {
      setNotice({ type: "error", message: "Lütfen bir villa seçin" });
      return;
    }
    const formData = new FormData();
    formData.set("name", groupName);
    formData.set("externalId", groupExternalId);
    formData.set("villaId", selectedVillaId);
    startTransition(async () => {
      const result = await createWhatsappCalendarGroup({}, formData);
      if (result.error) {
        setNotice({ type: "error", message: result.error });
        return;
      }
      // Aynı gruba ikinci villayı kolay eklemek için grup seçili kalsın.
      setSelectedVillaId("");
      setVillaSearch("");
      setVillaPickerOpen(false);
      setNotice({
        type: "ok",
        message: result.message ?? "Grup-villa eşleşmesi kaydedildi",
      });
      router.refresh();
    });
  }

  function handleDeleteGroup(id: string) {
    if (!window.confirm("Bu grup kaydı silinsin mi?")) return;
    startTransition(async () => {
      const result = await deleteWhatsappCalendarGroup(id);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.success ? "Grup silindi" : result.error ?? "Silinemedi",
      });
      if (result.success) router.refresh();
    });
  }

  function handleTestParser() {
    setNotice(null);
    startTransition(async () => {
      const result = await testWhatsappCalendarParserAction(sampleText);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message ?? result.error ?? "Test başarısız",
      });
    });
  }

  function handleCreatePhraseRule() {
    setNotice(null);
    const formData = new FormData();
    formData.set("phrase", phraseText.trim());
    formData.set("intent", phraseIntent);
    startTransition(async () => {
      const result = await createWhatsappCalendarPhraseRule({}, formData);
      if (result.error) {
        setNotice({ type: "error", message: result.error });
        return;
      }
      setPhraseText("");
      setNotice({ type: "ok", message: result.message ?? "Mesaj örneği eklendi" });
      router.refresh();
    });
  }

  function handleDeletePhraseRule(id: string) {
    if (!window.confirm("Bu mesaj örneği silinsin mi?")) return;
    startTransition(async () => {
      const result = await deleteWhatsappCalendarPhraseRule(id);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message ?? result.error ?? "Silinemedi",
      });
      if (result.success) router.refresh();
    });
  }

  function handleTogglePhraseRule(id: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleWhatsappCalendarPhraseRule(id, active);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message ?? result.error ?? "Güncellenemedi",
      });
      if (result.success) router.refresh();
    });
  }

  function handleCreateDateTraining() {
    setNotice(null);
    startTransition(async () => {
      const result = await createWhatsappCalendarDateTrainingAction(
        dateTrainingLine.trim()
      );
      if (result.error) {
        setNotice({ type: "error", message: result.error });
        return;
      }
      setNotice({
        type: "ok",
        message: result.message ?? "Tarih öğrenme örneği eklendi",
      });
      router.refresh();
    });
  }

  function handleDeleteDateTraining(id: string) {
    if (!window.confirm("Bu tarih öğrenme örneği silinsin mi?")) return;
    startTransition(async () => {
      const result = await deleteWhatsappCalendarDateTrainingAction(id);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message ?? result.error ?? "Silinemedi",
      });
      if (result.success) router.refresh();
    });
  }

  function handleToggleDateTraining(id: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleWhatsappCalendarDateTrainingAction(id, active);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message ?? result.error ?? "Güncellenemedi",
      });
      if (result.success) router.refresh();
    });
  }

  function handleRetryMessage(messageId: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await retryWhatsappCalendarMessageAction(messageId);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.success ? "Uygulandı" : "Hata",
      });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {notice ? (
        <div
          className={`order-1 rounded-xl px-4 py-3 text-sm xl:col-span-3 ${
            notice.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="order-2 grid gap-4 sm:grid-cols-3 xl:col-span-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Eşleşen Villa</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{mappedCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Kayıtlı Grup</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.groups.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Uygulanan Mesaj</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{appliedCount}</p>
        </div>
      </div>

      <details className="group order-3 overflow-hidden rounded-2xl border border-gray-200 bg-white xl:col-span-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold text-gray-800">
            Takvim WhatsApp Bağlantısı
          </span>
          <span className="text-lg text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="border-t border-gray-100">{connectionPanel}</div>
      </details>

      <details className="group order-4 overflow-hidden rounded-2xl border border-gray-200 bg-white xl:col-span-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold text-gray-800">
            Webhook Ayarları
          </span>
          <span className="text-lg text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="space-y-4 border-t border-gray-100 p-5">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            WhatsApp takvim otomasyonu aktif
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Webhook URL</span>
            <input readOnly value={webhookUrl} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Webhook Anahtarı (x-whatsapp-calendar-secret)
            </span>
            <input
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              className={inputClass}
              placeholder="Güvenli bir anahtar girin"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateSecret}
              disabled={isPending}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Anahtar Oluştur
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isPending}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              Ayarları Kaydet
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Köprü servisinizde webhook olarak bu URL&apos;yi tanımlayın. İstek başlığına{" "}
            <code>x-whatsapp-calendar-secret</code> ekleyin veya URL&apos;ye{" "}
            <code>?secret=...</code> parametresi verin.
          </p>
        </div>
      </details>

      <section className="order-5 rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-3">
        <h2 className="text-sm font-semibold text-gray-800">
          WhatsApp Grubu - Villa Eşleşmeleri
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          WhatsApp grubunu seçin, Group ID otomatik dolsun; ardından villayı seçip
          eşleştirin. Aynı gruba birden fazla villa bağlayabilirsiniz: grubu
          seçili bırakıp sırayla her villayı &quot;Eşleştir&quot; ile ekleyin
          (ör. Habitat 1-2 grubuna Habitat 1, sonra Habitat 2). Mesajda villa adı
          geçmezse komut gruptaki tüm villalara uygulanır; villa adı yazılırsa
          yalnız o villa güncellenir.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div ref={groupPickerRef} className="relative min-w-[240px] flex-[1.2]">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              WhatsApp Grubu
            </span>
            <button
              type="button"
              onClick={() => setGroupPickerOpen((open) => !open)}
              disabled={groupsLoading || isPending}
              className={`${inputClass} flex items-center justify-between gap-2 text-left disabled:opacity-60 ${
                selectedLiveGroup &&
                matchedGroupIds.has(canonicalWhatsappGroupId(selectedLiveGroup.id))
                  ? "border-emerald-200 bg-emerald-50"
                  : ""
              }`}
            >
              <span
                className={
                  selectedLiveGroup
                    ? "truncate text-gray-900"
                    : "truncate text-gray-400"
                }
              >
                {groupsLoading
                  ? "Gruplar yükleniyor…"
                  : selectedLiveGroup
                    ? selectedLiveGroup.name
                    : "Grup seçin"}
              </span>
              <span className="text-gray-400">⌄</span>
            </button>
            {groupPickerOpen ? (
              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 p-2">
                  <input
                    autoFocus
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    placeholder="Grup adı veya ID ara..."
                    className={inputClass}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredLiveGroups.length > 0 ? (
                    filteredLiveGroups.map((group) => {
                      const isMatched = matchedGroupIds.has(
                        canonicalWhatsappGroupId(group.id)
                      );
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleSelectLiveGroup(group.id)}
                          className={`flex w-full flex-col gap-0.5 border-b border-gray-50 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-teal-50 ${
                            isMatched ? "bg-emerald-50" : ""
                          } ${
                            groupExternalId === group.id ? "ring-1 ring-inset ring-teal-300" : ""
                          }`}
                        >
                          <span className="font-medium text-gray-900">
                            {group.name}
                          </span>
                          {isMatched ? (
                            <span className="text-xs font-medium text-emerald-700">
                              Eşleşmiş ·{" "}
                              {groupVillaNames
                                .get(canonicalWhatsappGroupId(group.id))
                                ?.join(", ")}
                              {(
                                groupVillaNames.get(
                                  canonicalWhatsappGroupId(group.id)
                                )?.length ?? 0
                              ) > 1
                                ? " (çoklu villa)"
                                : ""}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-4 py-6 text-center text-sm text-gray-500">
                      Eşleşen grup bulunamadı.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <label className="min-w-[220px] flex-[1.2]">
            <span className="mb-1 block text-xs font-medium text-gray-500">Grup ID</span>
            <input
              value={groupExternalId}
              readOnly
              className={`${inputClass} bg-gray-100`}
              placeholder="Listeden grup seçince dolar"
            />
          </label>
          <div ref={villaPickerRef} className="relative min-w-[280px] flex-[1.4]">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Villa Seçimi
            </span>
            <button
              type="button"
              onClick={() => setVillaPickerOpen((open) => !open)}
              disabled={isPending}
              className={`${inputClass} flex items-center justify-between gap-2 text-left disabled:opacity-60`}
            >
              <span
                className={
                  selectedVilla ? "truncate text-gray-900" : "truncate text-gray-400"
                }
              >
                {selectedVilla
                  ? formatVillaOptionLabel(selectedVilla)
                  : "Villa seçin"}
              </span>
              <span className="text-gray-400">⌄</span>
            </button>
            {villaPickerOpen ? (
              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 p-2">
                  <input
                    autoFocus
                    value={villaSearch}
                    onChange={(event) => setVillaSearch(event.target.value)}
                    placeholder="Villa adı, orijinal adı veya belge no ara..."
                    className={inputClass}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredVillas.length > 0 ? (
                    filteredVillas.map((villa) => (
                      <button
                        key={villa.id}
                        type="button"
                        onClick={() => {
                          setSelectedVillaId(villa.id);
                          setVillaSearch("");
                          setVillaPickerOpen(false);
                        }}
                        className={`flex w-full flex-col gap-0.5 border-b border-gray-50 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-teal-50 ${
                          selectedVillaId === villa.id ? "bg-teal-50" : ""
                        }`}
                      >
                        <span className="font-medium text-gray-900">
                          {formatVillaOptionLabel(villa)}
                        </span>
                        {villa.whatsappGroupId.trim() &&
                        groupExternalId &&
                        canonicalWhatsappGroupId(villa.whatsappGroupId) ===
                          canonicalWhatsappGroupId(groupExternalId) ? (
                          <span className="text-xs font-medium text-emerald-700">
                            Bu gruba bağlı
                          </span>
                        ) : villa.documentNo.trim() ? (
                          <span className="text-xs text-gray-500">
                            Belge No: {villa.documentNo}
                          </span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-center text-sm text-gray-500">
                      Eşleşen villa bulunamadı.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void loadLiveGroups()}
            disabled={groupsLoading || isPending}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Listeyi Yenile
          </button>
          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={
              isPending || !groupName || !groupExternalId || !selectedVillaId
            }
            className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            Eşleştir
          </button>
        </div>
        {groupExternalId &&
        (groupVillaNames.get(canonicalWhatsappGroupId(groupExternalId))
          ?.length ?? 0) > 0 ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Bu gruba bağlı villalar:{" "}
            <span className="font-semibold">
              {groupVillaNames
                .get(canonicalWhatsappGroupId(groupExternalId))
                ?.join(", ")}
            </span>
            . Başka villa eklemek için listeden seçip tekrar Eşleştir’e basın.
          </p>
        ) : null}
        {groupsError ? (
          <p className="mt-2 text-xs text-red-600">{groupsError}</p>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            Liste Evolution WhatsApp bağlantısındaki canlı gruplardan gelir.
            {liveGroups.length > 0 ? ` (${liveGroups.length} grup)` : ""}
          </p>
        )}

        <details className="group mt-4 overflow-hidden rounded-xl border border-gray-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gray-50 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-semibold text-gray-800">
              Bağlantı Yapılan Villalar
              <span className="ml-2 font-medium text-gray-500">
                ({data.groups.length})
              </span>
            </span>
            <span className="text-lg text-gray-400 transition-transform group-open:rotate-180">
              ⌄
            </span>
          </summary>
          <div className="overflow-hidden border-t border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">WhatsApp Grubu</th>
                  <th className="px-4 py-3">Group ID</th>
                  <th className="px-4 py-3">Villa Adı</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.length > 0 ? (
                  data.groups.map((group) => {
                    const isMatched = matchedGroupIds.has(
                      canonicalWhatsappGroupId(group.externalId)
                    );
                    return (
                      <tr
                        key={group.id}
                        className={`border-t ${
                          isMatched
                            ? "border-emerald-100 bg-emerald-50"
                            : "border-gray-100 bg-white"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-gray-900">
                              {group.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group.id)}
                              disabled={isPending}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                        <td className="break-all px-4 py-3 text-xs text-gray-600">
                          {group.externalId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {groupVillaNames
                            .get(canonicalWhatsappGroupId(group.externalId))
                            ?.join(", ") ?? (
                            <span className="text-gray-400">Eşleşme yok</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      Henüz grup tanımlanmadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <details className="group order-7 overflow-hidden rounded-2xl border border-gray-200 bg-white xl:col-span-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold text-gray-800">
            Mesaj Örnekleri (Öğrenme)
          </span>
          <span className="text-lg text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="border-t border-gray-100 p-5">
          <p className="text-sm text-gray-500">
          Gelen mesajda bu ifadelerden biri geçiyorsa sistem ilgili işlemi uygular.
          Örnek: ifade <code>kapatalım</code> + işlem <strong>Kapat</strong> → mesaj{" "}
          <code>19-20 temmuz kapatalım</code> takvimde o günleri dolu yapar. Tarih kısmını
          sistem mesajdan otomatik okur; buraya yalnızca anahtar ifadeyi yazın.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-500">
            <li>
              <code>Ağustos 8/15 doldu</code> → 8–15 Ağustos Kapat
            </li>
            <li>
              <code>7 10 ağustos satılmıştır</code> → 7–10 Ağustos Kapat
            </li>
            <li>
              <code>Giriş Tarihi: 21 Ağustos … Çıkış Tarihi: 24 Ağustos … kapatıldı</code> →
              21–24 Ağustos Kapat
            </li>
            <li>
              <code>16 agustos giriş 20 agustos çıkış … kapatabilir misiniz</code> → 16–20
              Ağustos Kapat
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-[1.4]">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Mesaj örneği / ifade
            </span>
            <input
              value={phraseText}
              onChange={(event) => setPhraseText(event.target.value)}
              placeholder="Örn: kapatalım, kiralandı, açalım"
              className={inputClass}
            />
          </label>
          <label className="min-w-[180px] flex-1">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Yapılacak işlem
            </span>
            <select
              value={phraseIntent}
              onChange={(event) =>
                setPhraseIntent(event.target.value as WhatsappCalendarPhraseIntent)
              }
              className={inputClass}
            >
              <option value="CLOSE">{WHATSAPP_CALENDAR_INTENT_LABELS.CLOSE}</option>
              <option value="OPEN">{WHATSAPP_CALENDAR_INTENT_LABELS.OPEN}</option>
              <option value="OPTION">{WHATSAPP_CALENDAR_INTENT_LABELS.OPTION}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleCreatePhraseRule}
            disabled={isPending || !phraseText.trim()}
            className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            Örnek Ekle
          </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Mesaj Örneği</th>
                <th className="px-4 py-3">İşlem</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {data.phraseRules.length > 0 ? (
                data.phraseRules.map((rule) => (
                  <tr key={rule.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{rule.phrase}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {WHATSAPP_CALENDAR_INTENT_LABELS[rule.intent]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          rule.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {rule.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleTogglePhraseRule(rule.id, !rule.active)}
                        disabled={isPending}
                        className="mr-3 text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-60"
                      >
                        {rule.active ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhraseRule(rule.id)}
                        disabled={isPending}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    Henüz mesaj örneği yok. Yukarıdan ekleyin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </details>

      <details className="group order-[68] overflow-hidden rounded-2xl border border-violet-200 bg-white xl:col-span-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-violet-50/60 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold text-violet-900">
            Tarih Öğrenme (Yapay Zeka)
          </span>
          <span className="text-lg text-violet-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="border-t border-violet-100 p-5">
          <p className="text-sm text-gray-600">
            Mesajdaki tarih ifadesinin nasıl okunacağını sisteme öğretin. Gelen
            mesajda örnek metin geçtiğinde belirttiğiniz tarih aralığı
            kullanılır. Ayrıca yaygın yazım hataları (ör.{" "}
            <code>ağaustos</code>) otomatik düzeltilir.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-500">
            <li>
              <code>1-8 ağaustos ==&gt; 01.08.2026 - 08.08.2026</code>
            </li>
            <li>
              <code>7 10 ağustos ==&gt; 07.08.2026 - 10.08.2026</code>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-[280px] flex-1">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Öğrenme satırı
              </span>
              <input
                value={dateTrainingLine}
                onChange={(event) => setDateTrainingLine(event.target.value)}
                placeholder="1-8 ağaustos ==> 01.08.2026 - 08.08.2026"
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={handleCreateDateTraining}
              disabled={isPending || !dateTrainingLine.trim()}
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              Örnek Ekle
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Öğrenme Satırı</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {data.dateTrainingRules.length > 0 ? (
                  data.dateTrainingRules.map((rule: WhatsappCalendarAdminData["dateTrainingRules"][number]) => (
                    <tr key={rule.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatDateTrainingLine(rule)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            rule.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {rule.active ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleDateTraining(rule.id, !rule.active)
                          }
                          disabled={isPending}
                          className="mr-3 text-xs font-semibold text-violet-700 hover:text-violet-800 disabled:opacity-60"
                        >
                          {rule.active ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDateTraining(rule.id)}
                          disabled={isPending}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      Henüz tarih öğrenme örneği yok. Yukarıdan ekleyin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <details className="group order-6 overflow-hidden rounded-2xl border border-gray-200 bg-white xl:col-span-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold text-gray-800">Mesaj Testi</span>
          <span className="text-lg text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="border-t border-gray-100 p-5">
          <p className="text-sm text-gray-500">
          Takvime uygulamadan önce sistemin mesajı nasıl okuduğunu deneyin. Örnek:{" "}
          <code>15-20 Temmuz dolu</code>, <code>Ağustos 8/15 doldu</code>,{" "}
          <code>7 10 ağustos satılmıştır</code>,{" "}
          <code>1-8 ağaustos dolu</code>,{" "}
          <code>16 agustos giriş 20 agustos çıkış kapatabilir misiniz</code>
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[280px] flex-1">
            <span className="mb-1 block text-xs font-medium text-gray-500">Örnek Mesaj</span>
            <input
              value={sampleText}
              onChange={(event) => setSampleText(event.target.value)}
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={handleTestParser}
            disabled={isPending}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Mesajı Test Et
          </button>
          </div>
        </div>
      </details>

      <section className="order-8 rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Son Gelen Mesajlar</h2>
          <span className="text-xs text-gray-500">
            Mesajlar anında uygulanır; liste her 1 dakikada yenilenir.
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Villa</th>
                <th className="px-4 py-3">Mesaj</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Sonuç</th>
              </tr>
            </thead>
            <tbody>
              {data.messages.length > 0 ? (
                data.messages.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {item.villa
                        ? `#${item.villa.villaId ?? "-"} ${item.villa.name}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{item.body}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                      {item.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-2">
                          <span>Hata</span>
                          <button
                            type="button"
                            onClick={() => handleRetryMessage(item.id)}
                            disabled={isPending}
                            className="rounded-md bg-rose-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            ÇİLEK
                          </button>
                        </span>
                      ) : item.status === "APPLIED" ? (
                        "Uygulandı"
                      ) : (
                        "Hata"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.resultMessage}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Henüz mesaj kaydı yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
