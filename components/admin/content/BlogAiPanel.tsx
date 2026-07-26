"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  CalendarClock,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { BlogAiPublishFrequency, BlogAiTopicStatus } from "@prisma/client";
import {
  addBlogAiTopicsAction,
  deleteBlogAiTopicAction,
  generateBlogAiTopicNowAction,
  resetBlogAiTopicAction,
  runBlogAiSchedulerNowAction,
  saveBlogAiSettingsAction,
} from "@/app/actions/admin/blog-ai";
import {
  BLOG_AI_FREQUENCY_OPTIONS,
  getBlogAiFrequencyLabel,
} from "@/lib/blog-ai-frequency";
import {
  CmsField,
  CmsFormSection,
  cmsInputClass,
} from "@/components/admin/content/CmsFormSections";

type Category = {
  id: string;
  name: string;
};

type Settings = {
  enabled: boolean;
  frequency: BlogAiPublishFrequency;
  defaultCategoryId: string | null;
  autoPublish: boolean;
  lastGeneratedAt: Date | string | null;
  nextRunAt: Date | string | null;
};

type Topic = {
  id: string;
  topic: string;
  categoryId: string | null;
  status: BlogAiTopicStatus;
  sortOrder: number;
  blogPostId: string | null;
  errorMessage: string;
  generatedAt: Date | string | null;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("tr-TR");
}

const STATUS_LABELS: Record<BlogAiTopicStatus, string> = {
  PENDING: "Bekliyor",
  GENERATING: "Üretiliyor",
  COMPLETED: "Tamamlandı",
  FAILED: "Hata",
};

const STATUS_CLASSES: Record<BlogAiTopicStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  GENERATING: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-teal-50 text-teal-700",
  FAILED: "bg-rose-50 text-rose-700",
};

export default function BlogAiPanel({
  settings,
  topics,
  categories,
  openaiConfigured,
}: {
  settings: Settings;
  topics: Topic[];
  categories: Category[];
  openaiConfigured: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  function runAction(action: () => Promise<{ error?: string; message?: string; success?: boolean }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "İşlem tamamlandı");
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Yapay Zeka Blog Üretici
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Konu listesinden sırayla blog yazısı üretir. Her yazı en az 500
              kelime, SEO uyumlu başlık/açıklama ve kapak görseli içerir.
            </p>
          </div>
        </div>
      </div>

      {!openaiConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>OpenAI anahtarı eksik.</strong> Sunucu{" "}
          <code className="rounded bg-amber-100 px-1">.env</code> dosyasına{" "}
          <code className="rounded bg-amber-100 px-1">OPENAI_API_KEY</code>{" "}
          eklenmeden blog üretimi çalışmaz.
        </div>
      ) : null}

      {(message || error) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-teal-200 bg-teal-50 text-teal-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <form
        action={(formData) =>
          runAction(async () => saveBlogAiSettingsAction(formData))
        }
        className="rounded-2xl border border-gray-200 bg-white p-5"
      >
        <CmsFormSection title="Yayın Ayarları">
          <div className="grid gap-4 md:grid-cols-2">
            <CmsField label="Yayın Sıklığı">
              <select
                name="frequency"
                defaultValue={settings.frequency}
                className={`cursor-pointer ${cmsInputClass}`}
              >
                {BLOG_AI_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </CmsField>
            <CmsField label="Varsayılan Kategori">
              <select
                name="defaultCategoryId"
                defaultValue={settings.defaultCategoryId ?? ""}
                className={`cursor-pointer ${cmsInputClass}`}
              >
                <option value="">Kategori seçin</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </CmsField>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={settings.enabled}
                className="h-4 w-4 rounded border-gray-300 text-violet-600"
              />
              Otomatik üretimi etkinleştir
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="autoPublish"
                defaultChecked={settings.autoPublish}
                className="h-4 w-4 rounded border-gray-300 text-violet-600"
              />
              Üretilen yazıları otomatik yayınla
            </label>
          </div>

          <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 md:grid-cols-3">
            <div>
              <span className="font-medium text-gray-800">Sıklık:</span>{" "}
              {getBlogAiFrequencyLabel(settings.frequency)}
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-gray-400" />
              Son üretim: {formatDate(settings.lastGeneratedAt)}
            </div>
            <div>
              Sonraki çalışma: {formatDate(settings.nextRunAt)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Ayarları Kaydet
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                runAction(async () => runBlogAiSchedulerNowAction())
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Sıradaki Konuyu Şimdi Üret
            </button>
          </div>
        </CmsFormSection>
      </form>

      <form
        action={(formData) =>
          runAction(async () => addBlogAiTopicsAction(formData))
        }
        className="rounded-2xl border border-gray-200 bg-white p-5"
      >
        <CmsFormSection title="Blog Konu Listesi">
          <CmsField
            label="Konular"
            hint="Her satıra bir konu yazın. Örn: Kalkan'da Villa Kiralama Rehberi"
          >
            <textarea
              name="topics"
              rows={6}
              placeholder={"Kalkan'da Villa Kiralama Rehberi\nFethiye'de En İyi Tatil Köyleri\nVilla Tatilinde Havuz Kullanım İpuçları"}
              className={cmsInputClass}
            />
          </CmsField>
          <div className="grid gap-4 md:grid-cols-2">
            <CmsField label="Kategori (opsiyonel)">
              <select
                name="categoryId"
                className={`cursor-pointer ${cmsInputClass}`}
              >
                <option value="">Varsayılan kategoriyi kullan</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </CmsField>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Konuları Listeye Ekle
          </button>
        </CmsFormSection>
      </form>

      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">
            Konu Kuyruğu ({topics.length})
          </h3>
        </div>
        <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
          <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Konu</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Üretim</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {topics.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Henüz konu eklenmedi.
                </td>
              </tr>
            ) : (
              topics.map((topic) => {
                const categoryName =
                  categories.find((cat) => cat.id === topic.categoryId)?.name ??
                  "Varsayılan";
                return (
                  <tr key={topic.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{topic.topic}</div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {categoryName}
                      </div>
                      {topic.errorMessage ? (
                        <div className="mt-1 text-xs text-rose-600">
                          {topic.errorMessage}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[topic.status]}`}
                      >
                        {STATUS_LABELS[topic.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(topic.generatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {topic.status !== "GENERATING" ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              runAction(async () =>
                                generateBlogAiTopicNowAction(topic.id)
                              )
                            }
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Üret
                          </button>
                        ) : null}
                        {topic.status === "COMPLETED" || topic.status === "FAILED" ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              runAction(async () => resetBlogAiTopicAction(topic.id))
                            }
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100"
                            aria-label="Yeniden kuyruğa al"
                            title="Yeniden kuyruğa al"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            if (!confirm("Konu silinsin mi?")) return;
                            runAction(async () => deleteBlogAiTopicAction(topic.id));
                          }}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Otomatik üretim sunucu cron ile saatte bir tetiklenir (
        <code className="rounded bg-gray-100 px-1.5 py-0.5">
          GET /api/cron/blog-generate
        </code>
        ). Gerçek yayın sıklığı yukarıdaki ayara göre belirlenir.
      </p>
    </div>
  );
}
