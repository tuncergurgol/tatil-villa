"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, MessageSquare, Plus, Save, Trash2 } from "lucide-react";
import {
  deleteTatilAssistantExampleAction,
  deleteTatilAssistantRuleAction,
  deleteTatilAssistantTopicAction,
  saveTatilAssistantExampleAction,
  saveTatilAssistantRuleAction,
  saveTatilAssistantSettingsAction,
  saveTatilAssistantTopicAction,
} from "@/app/actions/admin/tatil-assistant";
import AssistantWhatsappConnection from "@/components/admin/tatil-assistant/AssistantWhatsappConnection";

type Example = {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
};

type Topic = {
  id: number;
  title: string;
  sortOrder: number;
  active: boolean;
  examples: Example[];
};

type Rule = {
  id: number;
  title: string;
  content: string;
  sortOrder: number;
  active: boolean;
};

type TatilAssistantAdminPanelProps = {
  enabled: boolean;
  welcomeMessage: string;
  assistantWebhookSecret: string;
  assistantWahaBaseUrl: string;
  assistantWahaApiKey: string;
  assistantWahaSessionName: string;
  defaultPairingPhone: string;
  webhookUrl: string;
  topics: Topic[];
  rules: Rule[];
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100";

const tabs = [
  { id: "whatsapp", label: "WhatsApp Bağlantısı" },
  { id: "examples", label: "Mesaj Örnekleri" },
  { id: "rules", label: "Kurallar" },
  { id: "settings", label: "Genel Ayarlar" },
] as const;

export default function TatilAssistantAdminPanel(props: TatilAssistantAdminPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("whatsapp");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [enabled, setEnabled] = useState(props.enabled);
  const [welcomeMessage, setWelcomeMessage] = useState(props.welcomeMessage);
  const [webhookSecret, setWebhookSecret] = useState(props.assistantWebhookSecret);

  const saveSettings = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("enabled", enabled ? "true" : "false");
      formData.set("welcomeMessage", welcomeMessage);
      formData.set("assistantWebhookSecret", webhookSecret);
      const result = await saveTatilAssistantSettingsAction({}, formData);
      setMessage(result.message ?? null);
      setError(result.error ?? null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow">
            🐝
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Yapay Zeka Asistan
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Tatil Asistanı</h1>
            <p className="mt-1 text-sm text-gray-600">
              Web sitesi sohbet widget&apos;ı ve +90 549 618 01 08 WhatsApp hattı.
              Uygunluk arama kriterleriyle villa önerir.
            </p>
            {!props.enabled ? (
              <p className="mt-2 inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
                Şu an pasif — geliştirme sonrası Genel Ayarlar'dan açılır
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-amber-500 text-white shadow"
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "whatsapp" ? (
        <AssistantWhatsappConnection
          assistantWahaBaseUrl={props.assistantWahaBaseUrl}
          assistantWahaApiKey={props.assistantWahaApiKey}
          assistantWahaSessionName={props.assistantWahaSessionName}
          webhookUrl={props.webhookUrl}
          defaultPairingPhone={props.defaultPairingPhone}
        />
      ) : null}

      {activeTab === "examples" ? (
        <div className="space-y-4">
          {props.topics.map((topic) => (
            <div
              key={topic.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <form
                action={(formData) =>
                  startTransition(async () => {
                    const result = await saveTatilAssistantTopicAction(
                      topic.id,
                      formData
                    );
                    setError(result.error ?? null);
                    router.refresh();
                  })
                }
                className="mb-4 grid gap-3 md:grid-cols-[1fr_100px_auto]"
              >
                <input
                  name="title"
                  defaultValue={topic.title}
                  className={inputClass}
                />
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={topic.sortOrder}
                  className={inputClass}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="active"
                    value="true"
                    defaultChecked={topic.active}
                  />
                  Aktif
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white md:col-span-3 md:w-fit"
                >
                  Konuyu kaydet
                </button>
              </form>

              <div className="space-y-3">
                {topic.examples.map((example) => (
                  <form
                    key={example.id}
                    action={(formData) =>
                      startTransition(async () => {
                        formData.set("topicId", String(topic.id));
                        const result = await saveTatilAssistantExampleAction(
                          example.id,
                          formData
                        );
                        setError(result.error ?? null);
                        router.refresh();
                      })
                    }
                    className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                  >
                    <input type="hidden" name="topicId" value={topic.id} />
                    <div className="grid gap-2">
                      <input
                        name="question"
                        defaultValue={example.question}
                        placeholder="Soru"
                        className={inputClass}
                      />
                      <textarea
                        name="answer"
                        defaultValue={example.answer}
                        rows={3}
                        placeholder="Cevap"
                        className={inputClass}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          name="sortOrder"
                          type="number"
                          defaultValue={example.sortOrder}
                          className={`${inputClass} w-24`}
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="active"
                            value="true"
                            defaultChecked={example.active}
                          />
                          Aktif
                        </label>
                        <button
                          type="submit"
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white"
                        >
                          Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(async () => {
                              await deleteTatilAssistantExampleAction(example.id);
                              router.refresh();
                            })
                          }
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700"
                        >
                          <Trash2 className="inline size-4" />
                        </button>
                      </div>
                    </div>
                  </form>
                ))}

                <form
                  action={(formData) =>
                    startTransition(async () => {
                      formData.set("topicId", String(topic.id));
                      formData.set("sortOrder", "99");
                      formData.set("active", "true");
                      const result = await saveTatilAssistantExampleAction(
                        null,
                        formData
                      );
                      setError(result.error ?? null);
                      router.refresh();
                    })
                  }
                  className="rounded-xl border border-dashed border-amber-200 p-4"
                >
                  <input type="hidden" name="topicId" value={topic.id} />
                  <input type="hidden" name="sortOrder" value="99" />
                  <input type="hidden" name="active" value="true" />
                  <div className="grid gap-2">
                    <input
                      name="question"
                      placeholder="Yeni soru"
                      className={inputClass}
                      required
                    />
                    <textarea
                      name="answer"
                      rows={2}
                      placeholder="Yeni cevap"
                      className={inputClass}
                      required
                    />
                    <button
                      type="submit"
                      className="flex w-fit items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900"
                    >
                      <Plus className="size-4" /> Örnek ekle
                    </button>
                  </div>
                </form>
              </div>

              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await deleteTatilAssistantTopicAction(topic.id);
                    router.refresh();
                  })
                }
                className="mt-4 text-sm text-red-600"
              >
                Konuyu sil
              </button>
            </div>
          ))}

          <form
            action={(formData) =>
              startTransition(async () => {
                formData.set("sortOrder", "99");
                formData.set("active", "true");
                await saveTatilAssistantTopicAction(null, formData);
                router.refresh();
              })
            }
            className="flex gap-2 rounded-2xl border border-dashed border-gray-300 bg-white p-4"
          >
            <input type="hidden" name="sortOrder" value="99" />
            <input type="hidden" name="active" value="true" />
            <input
              name="title"
              placeholder="Yeni konu başlığı"
              className={inputClass}
              required
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Konu ekle
            </button>
          </form>
        </div>
      ) : null}

      {activeTab === "rules" ? (
        <div className="space-y-4">
          {props.rules.map((rule) => (
            <form
              key={rule.id}
              action={(formData) =>
                startTransition(async () => {
                  const result = await saveTatilAssistantRuleAction(rule.id, formData);
                  setError(result.error ?? null);
                  router.refresh();
                })
              }
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="grid gap-3">
                <input
                  name="title"
                  defaultValue={rule.title}
                  className={inputClass}
                />
                <textarea
                  name="content"
                  defaultValue={rule.content}
                  rows={4}
                  className={inputClass}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={rule.sortOrder}
                    className={`${inputClass} w-28`}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="active"
                      value="true"
                      defaultChecked={rule.active}
                    />
                    Aktif
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteTatilAssistantRuleAction(rule.id);
                        router.refresh();
                      })
                    }
                    className="text-sm text-red-600"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </form>
          ))}

          <form
            action={(formData) =>
              startTransition(async () => {
                formData.set("sortOrder", "99");
                formData.set("active", "true");
                await saveTatilAssistantRuleAction(null, formData);
                router.refresh();
              })
            }
            className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-5"
          >
            <input type="hidden" name="sortOrder" value="99" />
            <input type="hidden" name="active" value="true" />
            <div className="grid gap-3">
              <input
                name="title"
                placeholder="Kural başlığı"
                className={inputClass}
                required
              />
              <textarea
                name="content"
                rows={4}
                placeholder="İletişim / arama kuralı"
                className={inputClass}
                required
              />
              <button
                type="submit"
                className="flex w-fit items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="size-4" /> Kural ekle
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 text-gray-900">
            <Bot className="size-5 text-amber-600" />
            <h2 className="text-lg font-bold">Genel ayarlar</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Tatil Asistanı aktif (web widget + WhatsApp)
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                Karşılama mesajı
              </span>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={4}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                Webhook gizli anahtar (opsiyonel)
              </span>
              <input
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={saveSettings}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Save className="size-4" />
              Kaydet
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <MessageSquare className="mb-1 inline size-4 text-amber-600" /> Misafir
        soru sırası: ad → tarihler → kişi sayısı → bölge → özellikler. Arama motoru
        admin Uygunluk Ara ile aynıdır.
      </div>
    </div>
  );
}
