"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { generateVillaSeoWithAI } from "@/app/actions/admin/villa-seo-ai";
import type { Villa } from "@prisma/client";
import { normalizeSearchText } from "@/lib/search-text";

interface VillaMetaSeoTabProps {
  villa: Villa;
  previewDomain: string;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function joinKeywords(keywords: string[]) {
  return keywords.join(", ");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function VillaMetaSeoTab({
  villa,
  previewDomain,
}: VillaMetaSeoTabProps) {
  const initialKeywords = useMemo(
    () => parseKeywords(villa.seoKeywords),
    [villa.seoKeywords]
  );

  const [metaTitle, setMetaTitle] = useState(villa.seoTitle);
  const [metaDescription, setMetaDescription] = useState(villa.seoDescription);
  const [keywords, setKeywords] = useState(initialKeywords);
  const [keywordInput, setKeywordInput] = useState("");
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();

  const previewTitle = metaTitle.trim() || villa.name;
  const previewDescription =
    metaDescription.trim() ||
    stripHtml(villa.description) ||
    "Meta açıklama girilmedi";

  function addKeyword() {
    const value = keywordInput.trim();
    if (!value) return;
    if (
      keywords.some(
        (keyword) =>
          normalizeSearchText(keyword) === normalizeSearchText(value)
      )
    ) {
      setKeywordInput("");
      return;
    }
    setKeywords((prev) => [...prev, value]);
    setKeywordInput("");
  }

  function removeKeyword(keyword: string) {
    setKeywords((prev) => prev.filter((item) => item !== keyword));
  }

  function handleGenerateSeo() {
    setAiError(null);
    setAiMessage(null);

    startGenerate(async () => {
      const result = await generateVillaSeoWithAI(villa.id);
      if (result.error || !result.suggestion) {
        setAiError(result.error ?? "SEO önerisi oluşturulamadı");
        return;
      }

      setMetaTitle(result.suggestion.seoTitle);
      setMetaDescription(result.suggestion.seoDescription);
      setKeywords(parseKeywords(result.suggestion.seoKeywords));
      setAiMessage(
        result.source === "ai"
          ? "SEO metinleri yapay zeka ile oluşturuldu."
          : "SEO metinleri villa verilerine göre otomatik hazırlandı."
      );
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
          Google Önizleme
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-gray-500">
            {previewDomain} &gt; {villa.slug}
          </p>
          <p className="mt-1 text-lg text-[#1a0dab] hover:underline">
            {previewTitle}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">
            {previewDescription}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-800">SEO Ayarları</h2>
          <button
            type="button"
            onClick={handleGenerateSeo}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Oluşturuluyor..." : "AI ile Oluştur"}
          </button>
        </div>

        {aiError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {aiError}
          </p>
        ) : null}

        {aiMessage ? (
          <p className="mb-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
            {aiMessage}
          </p>
        ) : null}

        <p className="mb-4 text-xs text-gray-500">
          Villa adı, bölge, olanaklar ve vitrin bilgilerine göre meta alanları
          otomatik doldurulur.
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500">
              Meta Başlık
            </span>
            <input
              name="seoTitle"
              value={metaTitle}
              onChange={(event) => setMetaTitle(event.target.value)}
              maxLength={60}
              className={`mt-1.5 ${inputClass}`}
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {metaTitle.length} / 60
            </p>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">
              Meta Açıklama
            </span>
            <textarea
              name="seoDescription"
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
              maxLength={160}
              rows={4}
              className={`mt-1.5 resize-y ${inputClass}`}
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {metaDescription.length} / 160
            </p>
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
          Anahtar Kelimeler
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addKeyword();
              }
            }}
            placeholder="Anahtar kelime yazın..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={addKeyword}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700"
            aria-label="Anahtar kelime ekle"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {keywords.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="rounded-full p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                  aria-label={`${keyword} kaldır`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <input type="hidden" name="seoKeywords" value={joinKeywords(keywords)} />
      </section>
    </div>
  );
}
