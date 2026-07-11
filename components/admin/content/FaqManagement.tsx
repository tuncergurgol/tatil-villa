"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFaqItemAction,
  saveFaqItemAction,
} from "@/app/actions/admin/cms-content";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const categories = [
  { value: "genel", label: "Genel" },
  { value: "rezervasyon", label: "Rezervasyon" },
  { value: "odeme", label: "Ödeme" },
  { value: "villa-konaklama", label: "Villa & Konaklama" },
  { value: "iptal-iade", label: "İptal & İade" },
  { value: "bolge-tatil", label: "Bölge & Tatil" },
  { value: "guvenlik", label: "Güvenlik" },
];

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  slug: string;
  sortOrder: number;
  active: boolean;
};

export default function FaqManagement({ items }: { items: FaqRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all" ? items : items.filter((item) => item.category === filter);

  function refresh() {
    router.refresh();
  }

  function handleCreate(formData: FormData) {
    setNotice(null);
    startTransition(async () => {
      const result = await saveFaqItemAction(null, formData);
      setNotice(result.error ?? result.message ?? "Kaydedildi");
      if (result.success) refresh();
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      await saveFaqItemAction(id, formData);
      refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Bu soruyu silmek istiyor musunuz?")) return;
    startTransition(async () => {
      await deleteFaqItemAction(id);
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {notice}
        </div>
      ) : null}

      <form action={handleCreate} className="space-y-3 rounded-2xl border bg-white p-5">
        <h2 className="font-semibold text-gray-900">Yeni Soru Ekle</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="question" placeholder="Soru" required className={inputClass} />
          <select name="category" defaultValue="genel" className={inputClass}>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <textarea name="answer" placeholder="Cevap" required rows={4} className={inputClass} />
        <div className="flex flex-wrap items-center gap-3">
          <input name="slug" placeholder="Slug (opsiyonel)" className={`md:w-72 ${inputClass}`} />
          <input name="sortOrder" type="number" defaultValue={0} className={`w-28 ${inputClass}`} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked />
            Aktif
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Ekle
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${filter === "all" ? "bg-teal-600 text-white" : "bg-gray-100"}`}
        >
          Tümü ({items.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setFilter(cat.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === cat.value ? "bg-teal-600 text-white" : "bg-gray-100"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-white p-5">
            <form action={(fd) => handleUpdate(item.id, fd)} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input name="question" defaultValue={item.question} required className={inputClass} />
                <select name="category" defaultValue={item.category} className={inputClass}>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea name="answer" defaultValue={item.answer} required rows={4} className={inputClass} />
              <div className="grid gap-3 md:grid-cols-3">
                <input name="slug" defaultValue={item.slug} className={inputClass} />
                <input name="sortOrder" type="number" defaultValue={item.sortOrder} className={inputClass} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={item.active} />
                  Aktif
                </label>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="text-sm font-semibold text-teal-600">
                  Güncelle
                </button>
                <button type="button" onClick={() => handleDelete(item.id)} className="text-sm text-red-600">
                  Sil
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
