import Link from "next/link";
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
  if (faqs.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500">Henüz soru eklenmedi.</p>
    );
  }

  const present = new Set(faqs.map((faq) => faq.category));
  const categories = FAQ_CATEGORY_ORDER.filter((category) =>
    present.has(category)
  );

  return (
    <div className="space-y-5">
      {categories.length > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((category) => (
            <a
              key={category}
              href={`#sss-${category}`}
              className="inline-flex min-h-12 items-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-800 transition hover:border-sky-400 hover:bg-sky-50"
            >
              {getFaqCategoryLabel(category)}
            </a>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {faqs.map((faq, index) => (
          <details
            key={faq.id}
            id={
              faqs.findIndex((item) => item.category === faq.category) === index
                ? `sss-${faq.category}`
                : undefined
            }
            className="group/item rounded-2xl border border-sky-100/80 bg-white px-4 py-3.5 shadow-sm open:border-sky-200 open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-left font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
              <span>{faq.question}</span>
              <span className="mt-0.5 shrink-0 text-sky-400 transition group-open/item:rotate-180">
                ▾
              </span>
            </summary>
            <p className="mt-3 border-t border-sky-50 pt-3 text-sm leading-relaxed text-gray-600">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>

      <div className="pt-1 text-center">
        <Link
          href="/sik-sorulan-sorular"
          className="inline-flex items-center rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
        >
          Tüm soruları gör
        </Link>
      </div>
    </div>
  );
}
