"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteBlogPostAction,
  saveBlogCategoryAction,
  saveBlogPostAction,
} from "@/app/actions/admin/cms-content";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

type Category = { id: string; name: string; slug: string; sortOrder: number; active: boolean };
type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  authorName: string;
  categoryId: string | null;
  published: boolean;
  sortOrder: number;
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

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-semibold text-gray-900">Blog Kategorileri</h2>
        <form
          action={(fd) =>
            startTransition(async () => {
              await saveBlogCategoryAction(null, fd);
              refresh();
            })
          }
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          <input name="name" placeholder="Kategori adı" required className={inputClass} />
          <input name="slug" placeholder="slug" required className={inputClass} />
          <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
            Kategori Ekle
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span key={cat.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs">
              {cat.name}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-semibold text-gray-900">Yeni Blog Yazısı</h2>
        <form
          action={(fd) =>
            startTransition(async () => {
              await saveBlogPostAction(null, fd);
              refresh();
            })
          }
          className="mt-4 space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input name="title" placeholder="Başlık" required className={inputClass} />
            <input name="slug" placeholder="slug" required className={inputClass} />
          </div>
          <select name="categoryId" className={inputClass} defaultValue="">
            <option value="">Kategori seçin</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input name="coverImage" placeholder="Kapak görsel URL" className={inputClass} />
          <textarea name="excerpt" placeholder="Özet" rows={2} className={inputClass} />
          <textarea name="content" placeholder="İçerik (HTML destekli)" required rows={8} className={inputClass} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" />
            Yayında
          </label>
          <button type="submit" disabled={isPending} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
            Yazı Ekle
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-gray-900">Mevcut Yazılar ({posts.length})</h2>
        {posts.map((post) => (
          <div key={post.id} className="rounded-2xl border bg-white p-5">
            <form
              action={(fd) =>
                startTransition(async () => {
                  await saveBlogPostAction(post.id, fd);
                  refresh();
                })
              }
              className="space-y-3"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <input name="title" defaultValue={post.title} required className={inputClass} />
                <input name="slug" defaultValue={post.slug} required className={inputClass} />
              </div>
              <select name="categoryId" defaultValue={post.categoryId ?? ""} className={inputClass}>
                <option value="">Kategori yok</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input name="coverImage" defaultValue={post.coverImage} className={inputClass} />
              <textarea name="excerpt" defaultValue={post.excerpt} rows={2} className={inputClass} />
              <textarea name="content" defaultValue={post.content} required rows={6} className={inputClass} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="published" defaultChecked={post.published} />
                Yayında
              </label>
              <div className="flex gap-3">
                <button type="submit" className="text-sm font-semibold text-teal-600">
                  Güncelle
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      if (!confirm("Silinsin mi?")) return;
                      await deleteBlogPostAction(post.id);
                      refresh();
                    })
                  }
                  className="text-sm text-red-600"
                >
                  Sil
                </button>
              </div>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
