"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  deleteBlogPostAction,
  saveBlogCategoryAction,
  saveBlogPostAction,
} from "@/app/actions/admin/cms-content";
import RichTextEditor from "@/components/admin/villas/RichTextEditor";
import {
  CmsField,
  CmsFormSection,
  cmsInputClass,
} from "@/components/admin/content/CmsFormSections";

type Category = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  authorName: string;
  categoryId: string | null;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  published: boolean;
  publishedAt: Date | string | null;
  sortOrder: number;
};

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; post: Post };

function toDatetimeLocalValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyPost = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  authorName: "Tatildeyiz",
  categoryId: null as string | null,
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  published: false,
  publishedAt: null as Date | string | null,
  sortOrder: 0,
};

export default function BlogManagement({
  categories,
  posts,
}: {
  categories: Category[];
  posts: Post[];
}) {
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

  function refresh() {
    router.refresh();
  }

  function closeEditor() {
    setEditor(null);
    setError(null);
  }

  function handleSave(formData: FormData) {
    setError(null);
    const postId = editor?.mode === "edit" ? editor.post.id : null;
    startTransition(async () => {
      const result = await saveBlogPostAction(postId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      closeEditor();
      refresh();
    });
  }

  const values =
    editor?.mode === "edit" ? editor.post : { id: "", ...emptyPost };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800">Blog Kategorileri</h2>
        <form
          action={(fd) =>
            startTransition(async () => {
              await saveBlogCategoryAction(null, fd);
              refresh();
            })
          }
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          <input
            name="name"
            placeholder="Kategori adı"
            required
            className={cmsInputClass}
          />
          <input
            name="slug"
            placeholder="slug"
            required
            className={cmsInputClass}
          />
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Kategori Ekle
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat.id}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
            >
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Blog Yazıları</h2>
            <p className="mt-0.5 text-xs text-gray-500">{posts.length} yazı</p>
          </div>
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Yeni Yazı
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {posts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Henüz blog yazısı yok.
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const categoryName =
                    categories.find((cat) => cat.id === post.categoryId)?.name ??
                    "—";
                  return (
                    <tr key={post.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {post.title}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{categoryName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            post.published
                              ? "bg-teal-50 text-teal-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {post.published ? "Yayında" : "Taslak"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditor({ mode: "edit", post })}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                if (!confirm("Yazı silinsin mi?")) return;
                                await deleteBlogPostAction(post.id);
                                refresh();
                              })
                            }
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
                className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-gray-500" />
                    <h2 className="text-base font-semibold text-gray-900">
                      {editor.mode === "edit" ? "Yazı Düzenle" : "Yeni Yazı"}
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
                  key={editor.mode === "edit" ? editor.post.id : "create"}
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
                        <CmsField label="Yazı Başlığı">
                          <input
                            name="title"
                            defaultValue={values.title}
                            required
                            className={cmsInputClass}
                          />
                        </CmsField>
                        <CmsField label="Kategori">
                          <select
                            name="categoryId"
                            defaultValue={values.categoryId ?? ""}
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
                      <div className="grid gap-4 md:grid-cols-2">
                        <CmsField label="Slug">
                          <input
                            name="slug"
                            defaultValue={values.slug}
                            required
                            className={cmsInputClass}
                          />
                        </CmsField>
                        <CmsField label="Yazar">
                          <input
                            name="authorName"
                            defaultValue={values.authorName}
                            className={cmsInputClass}
                          />
                        </CmsField>
                      </div>
                      <CmsField label="Kapak Görsel URL">
                        <input
                          name="coverImage"
                          defaultValue={values.coverImage}
                          className={cmsInputClass}
                        />
                      </CmsField>
                      <CmsField label="Kısa Açıklama">
                        <textarea
                          name="excerpt"
                          defaultValue={values.excerpt}
                          rows={3}
                          className={cmsInputClass}
                        />
                      </CmsField>
                    </CmsFormSection>

                    <CmsFormSection title="İçerik">
                      <RichTextEditor
                        key={`blog-content-${editor?.mode === "edit" ? editor.post.id : "new"}`}
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
                      <div className="grid gap-4 md:grid-cols-2">
                        <CmsField
                          label="Yayın Tarihi"
                          hint="Boş bırakılırsa yazı taslak olarak kalır"
                        >
                          <input
                            name="publishedAt"
                            type="datetime-local"
                            defaultValue={toDatetimeLocalValue(values.publishedAt)}
                            className={cmsInputClass}
                          />
                        </CmsField>
                        <CmsField label="Yayın Durumu">
                          <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              name="published"
                              defaultChecked={values.published}
                              className="h-4 w-4 rounded border-gray-300 text-teal-600"
                            />
                            Yayında
                          </label>
                        </CmsField>
                      </div>
                      <input
                        type="hidden"
                        name="sortOrder"
                        defaultValue={values.sortOrder}
                      />
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
