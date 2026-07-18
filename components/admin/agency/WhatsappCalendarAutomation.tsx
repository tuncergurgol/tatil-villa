"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createWhatsappCalendarGroup,
  createWhatsappCalendarPhraseRule,
  deleteWhatsappCalendarGroup,
  deleteWhatsappCalendarPhraseRule,
  generateWhatsappCalendarWebhookSecretAction,
  listEvolutionWhatsappGroupsAction,
  saveWhatsappCalendarSettings,
  testWhatsappCalendarParserAction,
  toggleWhatsappCalendarPhraseRule,
} from "@/app/actions/admin/whatsapp-calendar";
import type { WhatsappCalendarAdminData } from "@/lib/queries/whatsapp-calendar";
import type { EvolutionWhatsappGroup } from "@/lib/evolution-client";
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

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Uygulandı",
  IGNORED: "Yok sayıldı",
  FAILED: "Hata",
  DUPLICATE: "Tekrar",
};

export default function WhatsappCalendarAutomation({
  data,
  webhookUrl,
}: {
  data: WhatsappCalendarAdminData;
  webhookUrl: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(data.enabled);
  const [webhookSecret, setWebhookSecret] = useState(data.webhookSecret);
  const [groupName, setGroupName] = useState("");
  const [groupExternalId, setGroupExternalId] = useState("");
  const [liveGroups, setLiveGroups] = useState<EvolutionWhatsappGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState("15-20 Temmuz dolu");
  const [phraseText, setPhraseText] = useState("");
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

  function handleSelectLiveGroup(groupId: string) {
    const selected = liveGroups.find((group) => group.id === groupId);
    if (!selected) {
      setGroupName("");
      setGroupExternalId("");
      return;
    }
    setGroupName(selected.name);
    setGroupExternalId(selected.id);
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
    const formData = new FormData();
    formData.set("name", groupName);
    formData.set("externalId", groupExternalId);
    startTransition(async () => {
      const result = await createWhatsappCalendarGroup({}, formData);
      if (result.error) {
        setNotice({ type: "error", message: result.error });
        return;
      }
      setGroupName("");
      setGroupExternalId("");
      setNotice({ type: "ok", message: "Grup kaydı eklendi" });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Takvim WhatsApp Otomasyonu</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Takvim WhatsApp hattınızdaki grup mesajlarını webhook ile alır, villayla eşleştirir
          ve mesajdaki tarihe göre takvimi otomatik açar/kapatır.
        </p>
      </div>

      <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
        <h2 className="text-sm font-semibold text-sky-900">
          WhatsApp dinleme nasıl çalışır?
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-sky-900/90">
          <li>
            Bağlı Takvim WhatsApp hattı (Evolution) gruptaki mesajları{" "}
            <strong>anlık</strong> dinler.
          </li>
          <li>
            Yeni mesaj gelince Evolution, sistemimizin webhook adresine (
            <code className="rounded bg-white/80 px-1">/api/webhooks/whatsapp-calendar</code>
            ) POST isteği atar.
          </li>
          <li>
            Sistem mesajı grup ID ile villaya eşleştirir; aşağıdaki{" "}
            <strong>Mesaj Örnekleri</strong> + tarih bilgisinden işlemi çıkarır ve takvimi
            günceller.
          </li>
          <li>
            Sonuç <strong>Son Gelen Mesajlar</strong> tablosuna yazılır (Uygulandı / Yok
            sayıldı / Hata).
          </li>
        </ol>
        <p className="mt-3 text-xs text-sky-800">
          Not: Kendi hattınızdan (fromMe) gönderilen mesajlar yok sayılır. Dinlemenin
          çalışması için üstte otomasyonun açık olması ve Evolution webhook&apos;unun kayıtlı
          olması gerekir (Ayarları Kaydet).
        </p>
      </section>

      {notice ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800">Webhook Ayarları</h2>
        <div className="mt-4 space-y-4">
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
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800">WhatsApp Grupları</h2>
        <p className="mt-2 text-sm text-gray-500">
          Grup adı, WhatsApp&apos;ta bağlı cihazınızdaki grup listesinden gelir. Listeden
          seçin; Grup ID otomatik dolar. Sonra villa iCal sekmesinden bu grubu villaya
          eşleştirin.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-[1.2]">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              WhatsApp Grubu
            </span>
            <select
              value={groupExternalId}
              onChange={(event) => handleSelectLiveGroup(event.target.value)}
              className={inputClass}
              disabled={groupsLoading || isPending}
            >
              <option value="">
                {groupsLoading
                  ? "Gruplar yükleniyor…"
                  : "Grup seçin"}
              </option>
              {liveGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[220px] flex-[1.2]">
            <span className="mb-1 block text-xs font-medium text-gray-500">Grup ID</span>
            <input
              value={groupExternalId}
              readOnly
              className={`${inputClass} bg-gray-100`}
              placeholder="Listeden grup seçince dolar"
            />
          </label>
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
            disabled={isPending || !groupName || !groupExternalId}
            className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            Grup Ekle
          </button>
        </div>
        {groupsError ? (
          <p className="mt-2 text-xs text-red-600">{groupsError}</p>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            Liste Evolution WhatsApp bağlantısındaki canlı gruplardan gelir.
            {liveGroups.length > 0 ? ` (${liveGroups.length} grup)` : ""}
          </p>
        )}
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Grup Adı</th>
                <th className="px-4 py-3">Grup ID</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {data.groups.length > 0 ? (
                data.groups.map((group) => (
                  <tr key={group.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{group.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{group.externalId}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group.id)}
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
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    Henüz grup tanımlanmadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800">
          Mesaj Örnekleri (Öğrenme)
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Gelen mesajda bu ifadelerden biri geçiyorsa sistem ilgili işlemi uygular.
          Örnek: ifade <code>kapatalım</code> + işlem <strong>Kapat</strong> → mesaj{" "}
          <code>19-20 temmuz kapatalım</code> takvimde o günleri dolu yapar. Tarih kısmını
          sistem mesajdan otomatik okur; buraya yalnızca anahtar ifadeyi yazın.
        </p>
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
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800">Mesaj Testi</h2>
        <p className="mt-2 text-sm text-gray-500">
          Takvime uygulamadan önce sistemin mesajı nasıl okuduğunu deneyin. Örnek:{" "}
          <code>15-20 Temmuz dolu</code>, <code>01.08-05.08 açık</code>,{" "}
          <code>10-12 Ağustos opsiyon</code>
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
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800">Villa - Grup Eşleşmeleri</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Villa</th>
                <th className="px-4 py-3">Grup ID</th>
              </tr>
            </thead>
            <tbody>
              {data.mappedVillas.length > 0 ? (
                data.mappedVillas.map((villa) => (
                  <tr key={villa.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      #{villa.villaId ?? "-"} - {villa.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {villa.whatsappGroupId}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-sm text-gray-500">
                    Henüz villa-grup eşleşmesi yok. Villa düzenle → iCal Takvim sekmesinden
                    eşleştirin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800">Son Gelen Mesajlar</h2>
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
                      {STATUS_LABELS[item.status] ?? item.status}
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
