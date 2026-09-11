"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import CategoryFilterPills from "@/components/ui/CategoryFilterPills";
import {
  FAQ_CATEGORY_ORDER,
  getFaqCategoryLabel,
} from "@/lib/faq-categories";

export type HomeFaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export default function FaqCategoryPanel({ faqs }: { faqs: HomeFaqItem[] }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const present = new Set(faqs.map((faq) => faq.category));
    return FAQ_CATEGORY_ORDER.filter((category) => present.has(category)).map(
      (category) => ({
        id: category,
        label: getFaqCategoryLabel(category),
      })
    );
  }, [faqs]);

  const visibleFaqs = useMemo(() => {
    if (!activeCategory) return faqs;
    return faqs.filter((faq) => faq.category === activeCategory);
  }, [faqs, activeCategory]);

  if (faqs.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500">Henüz soru eklenmedi.</p>
    );
  }

  return (
    <div className="space-y-5">
      <CategoryFilterPills
        categories={categories}
        activeId={activeCategory}
        onChange={setActiveCategory}
      />

      {visibleFaqs.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
          Bu kategoride soru bulunamadı.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleFaqs.map((faq) => (
            <details
              key={faq.id}
              className="group/item rounded-2xl border border-sky-100/80 bg-white px-4 py-3.5 shadow-sm open:border-sky-200 open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-left font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-sky-400 transition group-open/item:rotate-180" />
              </summary>
              <p className="mt-3 border-t border-sky-50 pt-3 text-sm leading-relaxed text-gray-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      )}

      <div className="pt-1 text-center">
        <Link
          href="/sik-sorulan-sorular"
          className="inline-flex items-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
        >
          Tüm soruları gör
        </Link>
      </div>
    </div>
  );
}
