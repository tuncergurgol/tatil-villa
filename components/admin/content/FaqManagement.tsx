"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFaqItemAction,
  saveFaqItemAction,
} from "@/app/actions/admin/cms-content";
import {
  CmsField,
  CmsFormSection,
  cmsInputClass,
} from "@/components/admin/content/CmsFormSections";

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

      <form
        action={handleCreate}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-gray-800">Yeni Soru Ekle</h2>

        <CmsFormSection title="Temel Bilgiler">
          <div className="grid gap-4 md:grid-cols-2">
            <CmsField label="Soru">
              <input
                name="question"
                placeholder="Soru"
                required
                className={cmsInputClass}
              />
            </CmsField>
            <CmsField label="Kategori">
              <select
                name="category"
                defaultValue="genel"
                className={`cursor-pointer ${cmsInputClass}`}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </CmsField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CmsField label="Slug" hint="Boş bırakılırsa otomatik üretilir">
              <input
                name="slug"
                placeholder="opsiyonel"
                className={cmsInputClass}
              />
            </CmsField>
            <CmsField label="Sıra">
              <input
                name="sortOrder"
                type="number"
                defaultValue={0}
                className={cmsInputClass}
              />
            </CmsField>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-teal-600"
            />
            Aktif
          </label>
        </CmsFormSection>

        <CmsFormSection title="İçerik">
          <CmsField label="Cevap">
            <textarea
              name="answer"
              placeholder="Cevap"
              required
              rows={4}
              className={cmsInputClass}
            />
          </CmsField>
        </CmsFormSection>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Ekle
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            filter === "all" ? "bg-teal-600 text-white" : "bg-gray-100"
          }`}
        >
          Tümü ({items.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setFilter(cat.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === cat.value ? "bg-teal-600 text-white" : "bg-gray-100"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
          >
            <form
              action={(fd) => handleUpdate(item.id, fd)}
              className="space-y-5"
            >
              <CmsFormSection title="Temel Bilgiler">
                <div className="grid gap-4 md:grid-cols-2">
                  <CmsField label="Soru">
                    <input
                      name="question"
                      defaultValue={item.question}
                      required
                      className={cmsInputClass}
                    />
                  </CmsField>
                  <CmsField label="Kategori">
                    <select
                      name="category"
                      defaultValue={item.category}
                      className={`cursor-pointer ${cmsInputClass}`}
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </CmsField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <CmsField label="Slug">
                    <input
                      name="slug"
                      defaultValue={item.slug}
                      className={cmsInputClass}
                    />
                  </CmsField>
                  <CmsField label="Sıra">
                    <input
                      name="sortOrder"
                      type="number"
                      defaultValue={item.sortOrder}
                      className={cmsInputClass}
                    />
                  </CmsField>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={item.active}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                  />
                  Aktif
                </label>
              </CmsFormSection>

              <CmsFormSection title="İçerik">
                <CmsField label="Cevap">
                  <textarea
                    name="answer"
                    defaultValue={item.answer}
                    required
                    rows={4}
                    className={cmsInputClass}
                  />
                </CmsField>
              </CmsFormSection>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="text-sm font-semibold text-teal-600"
                >
                  Güncelle
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-sm text-red-600"
                >
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
