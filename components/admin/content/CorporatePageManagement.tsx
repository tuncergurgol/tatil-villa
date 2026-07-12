"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Pencil, Plus, Save, X } from "lucide-react";
import { saveCmsPageAction } from "@/app/actions/admin/cms-content";
import RichTextEditor from "@/components/admin/villas/RichTextEditor";
import {
  CmsField,
  CmsFormSection,
  cmsInputClass,
} from "@/components/admin/content/CmsFormSections";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  pageType: "CORPORATE" | "LEGAL" | "LANDING";
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  published: boolean;
  showInFooter: boolean;
  sortOrder: number;
};

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; page: PageRow };

const pageTypeLabel: Record<PageRow["pageType"], string> = {
  CORPORATE: "Kurumsal",
  LEGAL: "Yasal",
  LANDING: "Rehber",
};

const emptyDefaults = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  pageType: "CORPORATE" as const,
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  published: false,
  showInFooter: true,
  sortOrder: 0,
};

export default function CorporatePageManagement({ pages }: { pages: PageRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!editor) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeEditor();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [editor]);

  function closeEditor() {
    setEditor(null);
    setError(null);
  }

  function handleSave(formData: FormData) {
    setError(null);
    const pageId = editor?.mode === "edit" ? editor.page.id : null;
    startTransition(async () => {
      const result = await saveCmsPageAction(pageId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      closeEditor();
      router.refresh();
    });
  }

  const values =
    editor?.mode === "edit"
      ? editor.page
      : { id: "", ...emptyDefaults };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Kurumsal Sayfalar</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {pages.length} sayfa · Düzenlemek için satıra tıklayın
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ mode: "create" })}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Yeni Sayfa
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Sayfa Başlığı</th>
              <th className="px-4 py-3">Tür</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  Henüz kurumsal sayfa yok.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-medium text-gray-900">{page.title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {pageTypeLabel[page.pageType]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">/{page.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        page.published
                          ? "bg-teal-50 text-teal-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {page.published ? "Yayında" : "Taslak"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditor({ mode: "edit", page })}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mounted && editor
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="Kapat"
                className="absolute inset-0 bg-slate-900/45"
                onClick={closeEditor}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cms-page-editor-title"
                className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-gray-500" />
                    <h2
                      id="cms-page-editor-title"
                      className="text-base font-semibold text-gray-900"
                    >
                      {editor.mode === "edit" ? "Sayfa Düzenle" : "Yeni Sayfa"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditor}
                    aria-label="Kapat"
                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  key={editor.mode === "edit" ? editor.page.id : "create"}
                  action={handleSave}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    {error ? (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </p>
                    ) : null}

                    <CmsFormSection title="Temel Bilgiler">
                      <div className="grid gap-4 md:grid-cols-2">
                        <CmsField label="Sayfa Başlığı">
                          <input
                            name="title"
                            defaultValue={values.title}
                            required
                            className={cmsInputClass}
                          />
                        </CmsField>
                        <CmsField label="Sayfa Türü">
                          <select
                            name="pageType"
                            defaultValue={values.pageType}
                            className={`cursor-pointer ${cmsInputClass}`}
                          >
                            <option value="CORPORATE">Kurumsal</option>
                            <option value="LEGAL">Yasal</option>
                            <option value="LANDING">Rehber</option>
                          </select>
                        </CmsField>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <CmsField label="Slug">
                          <input
                            name="slug"
                            defaultValue={values.slug}
                            required
                            className={cmsInputClass}
                          />
                        </CmsField>
                        <CmsField label="Sıra">
                          <input
                            name="sortOrder"
                            type="number"
                            defaultValue={values.sortOrder}
                            className={cmsInputClass}
                          />
                        </CmsField>
                      </div>
                      <CmsField label="Kısa Açıklama">
                        <textarea
                          name="excerpt"
                          defaultValue={values.excerpt}
                          rows={3}
                          className={cmsInputClass}
                        />
                      </CmsField>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="published"
                            defaultChecked={values.published}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600"
                          />
                          Yayında
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="showInFooter"
                            defaultChecked={values.showInFooter}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600"
                          />
                          Footer&apos;da göster
                        </label>
                      </div>
                    </CmsFormSection>

                    <CmsFormSection title="İçerik">
                      <RichTextEditor
                        name="content"
                        defaultValue={values.content}
                      />
                    </CmsFormSection>

                    <CmsFormSection title="SEO Bilgileri">
                      <div className="grid gap-4 md:grid-cols-2">
                        <CmsField label="SEO Başlık">
                          <input
                            name="seoTitle"
                            defaultValue={values.seoTitle}
                            className={cmsInputClass}
                          />
                        </CmsField>
                        <CmsField label="SEO Anahtar Kelimeler">
                          <input
                            name="seoKeywords"
                            defaultValue={values.seoKeywords}
                            className={cmsInputClass}
                          />
                        </CmsField>
                      </div>
                      <CmsField label="SEO Açıklama">
                        <textarea
                          name="seoDescription"
                          defaultValue={values.seoDescription}
                          rows={3}
                          className={cmsInputClass}
                        />
                      </CmsField>
                    </CmsFormSection>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3.5">
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="cursor-pointer rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {isPending
                        ? "Kaydediliyor..."
                        : editor.mode === "edit"
                          ? "Güncelle"
                          : "Kaydet"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
