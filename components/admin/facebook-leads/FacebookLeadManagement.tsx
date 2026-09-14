"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FacebookLeadStatus } from "@prisma/client";
import {
  CalendarClock,
  Check,
  Megaphone,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  createManualFacebookLeadAction,
  createTestFacebookLeadAction,
  deleteFacebookLeadAction,
  logFacebookLeadContactAction,
  markFacebookLeadSeenAction,
  scheduleFacebookLeadFollowUpAction,
  updateFacebookLeadNoteAction,
  updateFacebookLeadStatusAction,
} from "@/app/actions/admin/facebook-leads";
import FacebookLeadSettingsPanel from "@/components/admin/facebook-leads/FacebookLeadSettingsPanel";
import {
  FACEBOOK_LEAD_CONTACT_CHANNELS,
  FACEBOOK_LEAD_STATUS_COLORS,
  FACEBOOK_LEAD_STATUS_LABELS,
} from "@/lib/facebook-lead-labels";
import type {
  FacebookLeadCounts,
  FacebookLeadListItem,
} from "@/lib/queries/facebook-leads";
import { includesSearchText } from "@/lib/search-text";

type Tab = "leads" | "settings";

type Props = {
  leads: FacebookLeadListItem[];
  counts: FacebookLeadCounts;
  settings: {
    enabled: boolean;
    appId: string;
    appSecret: string;
    verifyToken: string;
    pageId: string;
    pageAccessToken: string;
  };
  webhookUrl: string;
};

function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function toLocalInputValue(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function FacebookLeadManagement({
  leads,
  counts,
  settings,
  webhookUrl,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("leads");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FacebookLeadStatus | "all">(
    "all"
  );
  const [onlyUnseen, setOnlyUnseen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    leads[0]?.id ?? null
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [contactChannel, setContactChannel] = useState("whatsapp");
  const [contactMessage, setContactMessage] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        includesSearchText(lead.fullName, search) ||
        includesSearchText(lead.phone, search) ||
        includesSearchText(lead.email, search) ||
        includesSearchText(lead.formName, search) ||
        includesSearchText(lead.campaignName, search);
      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter;
      const matchesUnseen = !onlyUnseen || !lead.adminSeenAt;
      return matchesSearch && matchesStatus && matchesUnseen;
    });
  }, [leads, search, statusFilter, onlyUnseen]);

  const selected =
    filtered.find((item) => item.id === selectedId) ??
    leads.find((item) => item.id === selectedId) ??
    null;

  function selectLead(lead: FacebookLeadListItem) {
    setSelectedId(lead.id);
    setNoteDraft(lead.adminNote);
    setFollowUpDraft(toLocalInputValue(lead.nextFollowUpAt));
    if (!lead.adminSeenAt) {
      startTransition(async () => {
        await markFacebookLeadSeenAction(lead.id);
        router.refresh();
      });
    }
  }

  function runAction(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "İşlem başarısız");
      }
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Facebook Lead</h1>
            <p className="text-sm text-gray-500">
              Toplam {counts.total} · Yeni {counts.new} · Görülmemiş{" "}
              {counts.unseen} · Takip bekleyen {counts.followUpDue}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              runAction(async () => {
                await createTestFacebookLeadAction();
              })
            }
            disabled={isPending}
            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            Test lead oluştur
          </button>
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Manuel lead
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            ["leads", "Lead listesi"],
            ["settings", "Facebook bağlantısı"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {manualOpen ? (
        <form
          className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-4"
          action={(formData) => {
            runAction(async () => {
              const result = await createManualFacebookLeadAction(formData);
              if (!result.ok) {
                setError(result.message ?? "Kayıt başarısız");
                return;
              }
              setManualOpen(false);
            });
          }}
        >
          <input
            name="fullName"
            placeholder="Ad Soyad"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="phone"
            placeholder="Telefon"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="email"
            placeholder="E-posta"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="note"
            placeholder="Not"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white md:col-span-4"
          >
            Lead kaydet
          </button>
        </form>
      ) : null}

      {tab === "settings" ? (
        <FacebookLeadSettingsPanel
          enabled={settings.enabled}
          appId={settings.appId}
          appSecret={settings.appSecret}
          verifyToken={settings.verifyToken}
          pageId={settings.pageId}
          pageAccessToken={settings.pageAccessToken}
          webhookUrl={webhookUrl}
        />
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="space-y-3 border-b border-gray-100 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ad, telefon, e-posta, kampanya ara…"
                  className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as FacebookLeadStatus | "all")
                  }
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                >
                  <option value="all">Tüm durumlar</option>
                  {Object.entries(FACEBOOK_LEAD_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={onlyUnseen}
                    onChange={(e) => setOnlyUnseen(e.target.checked)}
                  />
                  Sadece görülmemiş
                </label>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  Henüz Facebook lead yok. Bağlantıyı kurun veya test lead
                  oluşturun.
                </div>
              ) : (
                <ul>
                  {filtered.map((lead) => (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => selectLead(lead)}
                        className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 ${
                          selected?.id === lead.id ? "bg-blue-50/70" : ""
                        }`}
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {lead.fullName || lead.phone || "İsimsiz lead"}
                            </span>
                            {!lead.adminSeenAt ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                                Yeni
                              </span>
                            ) : null}
                            {lead.isTest ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                Test
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {lead.phone || "—"} · {formatDateTime(lead.createdAt)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              FACEBOOK_LEAD_STATUS_COLORS[lead.status]
                            }`}
                          >
                            {FACEBOOK_LEAD_STATUS_LABELS[lead.status]}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {!selected ? (
              <p className="text-sm text-gray-500">Detay için bir lead seçin.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selected.fullName || "İsimsiz lead"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDateTime(selected.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm("Lead silinsin mi?")) return;
                      runAction(async () => {
                        await deleteFacebookLeadAction(selected.id);
                        setSelectedId(null);
                      });
                    }}
                    className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-2 text-sm text-gray-700">
                  {selected.phone ? (
                    <a
                      href={`tel:${selected.phone}`}
                      className="inline-flex items-center gap-2 text-blue-700 hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {selected.phone}
                    </a>
                  ) : null}
                  {selected.email ? <p>{selected.email}</p> : null}
                  {selected.formName ? <p>Form: {selected.formName}</p> : null}
                  {selected.campaignName ? (
                    <p>Kampanya: {selected.campaignName}</p>
                  ) : null}
                </div>

                {selected.customFieldsJson ? (
                  <div className="rounded-xl bg-gray-50 p-3 text-sm">
                    {Object.entries(selected.customFieldsJson).map(([key, value]) => (
                      <p key={key}>
                        <span className="font-medium text-gray-800">{key}:</span>{" "}
                        {value}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div>
                  <label className="text-sm font-medium text-gray-700">Durum</label>
                  <select
                    value={selected.status}
                    disabled={isPending}
                    onChange={(e) =>
                      runAction(async () => {
                        await updateFacebookLeadStatusAction(
                          selected.id,
                          e.target.value as FacebookLeadStatus
                        );
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  >
                    {Object.entries(FACEBOOK_LEAD_STATUS_LABELS).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Dahili not
                  </label>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () => {
                        await updateFacebookLeadNoteAction(selected.id, noteDraft);
                      })
                    }
                    className="mt-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Notu kaydet
                  </button>
                </div>

                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <CalendarClock className="h-4 w-4" />
                    Takip tarihi
                  </p>
                  <input
                    type="datetime-local"
                    value={followUpDraft}
                    onChange={(e) => setFollowUpDraft(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () => {
                        await scheduleFacebookLeadFollowUpAction(
                          selected.id,
                          followUpDraft
                        );
                      })
                    }
                    className="mt-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700"
                  >
                    Takip tarihini kaydet
                  </button>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    <MessageSquare className="h-4 w-4" />
                    İletişim kaydı
                  </p>
                  <div className="mt-2 grid gap-2">
                    <select
                      value={contactChannel}
                      onChange={(e) => setContactChannel(e.target.value)}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    >
                      {FACEBOOK_LEAD_CONTACT_CHANNELS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      rows={3}
                      placeholder="Arama / WhatsApp / not özeti…"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={isPending || !contactMessage.trim()}
                      onClick={() =>
                        runAction(async () => {
                          await logFacebookLeadContactAction({
                            leadId: selected.id,
                            channel: contactChannel,
                            message: contactMessage,
                            markContacted: true,
                          });
                          setContactMessage("");
                        })
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      <Check className="h-4 w-4" />
                      İletişimi kaydet
                    </button>
                  </div>
                </div>

                {selected.contactLogs.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      İletişim geçmişi
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {selected.contactLogs.map((log) => (
                        <li
                          key={log.id}
                          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                        >
                          <p className="text-xs font-semibold text-gray-500">
                            {log.channel} · {formatDateTime(log.createdAt)}
                          </p>
                          <p className="mt-1 whitespace-pre-line text-gray-800">
                            {log.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
