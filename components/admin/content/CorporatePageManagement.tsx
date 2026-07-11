"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCmsPageAction } from "@/app/actions/admin/cms-content";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  pageType: "CORPORATE" | "LEGAL" | "LANDING";
  seoTitle: string;
  seoDescription: string;
  published: boolean;
  showInFooter: boolean;
  sortOrder: number;
};

export default function CorporatePageManagement({ pages }: { pages: PageRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {pages.map((page) => (
        <div key={page.id} className="rounded-2xl border bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900">{page.title}</h2>
            <a
              href={`/kurumsal/${page.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-teal-600 hover:underline"
            >
              /kurumsal/{page.slug}
            </a>
          </div>
          <form
            action={(fd) =>
              startTransition(async () => {
                await saveCmsPageAction(page.id, fd);
                router.refresh();
              })
            }
            className="space-y-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <input name="title" defaultValue={page.title} required className={inputClass} />
              <input name="slug" defaultValue={page.slug} required className={inputClass} />
            </div>
            <select name="pageType" defaultValue={page.pageType} className={inputClass}>
              <option value="CORPORATE">Kurumsal</option>
              <option value="LEGAL">Yasal</option>
              <option value="LANDING">Rehber</option>
            </select>
            <textarea name="excerpt" defaultValue={page.excerpt} rows={2} className={inputClass} />
            <textarea name="content" defaultValue={page.content} required rows={10} className={inputClass} />
            <div className="grid gap-3 md:grid-cols-2">
              <input name="seoTitle" defaultValue={page.seoTitle} placeholder="SEO başlık" className={inputClass} />
              <input name="sortOrder" type="number" defaultValue={page.sortOrder} className={inputClass} />
            </div>
            <textarea
              name="seoDescription"
              defaultValue={page.seoDescription}
              placeholder="SEO açıklama"
              rows={2}
              className={inputClass}
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="published" defaultChecked={page.published} />
                Yayında
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="showInFooter" defaultChecked={page.showInFooter} />
                Footer&apos;da göster
              </label>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Kaydet
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
