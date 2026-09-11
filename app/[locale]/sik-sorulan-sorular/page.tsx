import type { Metadata } from "next";
import {
  getActiveFaqsForPublic,
  getFaqCategoriesForPublic,
} from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sık Sorulan Sorular",
  description:
    "Villa kiralama, rezervasyon, ödeme, iptal ve konaklama hakkında sık sorulan sorular ve cevapları.",
};

const categoryLabels: Record<string, string> = {
  genel: "Genel",
  rezervasyon: "Rezervasyon",
  odeme: "Ödeme",
  "villa-konaklama": "Villa & Konaklama",
  "iptal-iade": "İptal & İade",
  "bolge-tatil": "Bölge & Tatil",
  guvenlik: "Güvenlik",
};

export default async function FaqPage() {
  const [faqs, categories] = await Promise.all([
    getActiveFaqsForPublic(),
    getFaqCategoriesForPublic(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-bold text-gray-900">Sık Sorulan Sorular</h1>
      <p className="mt-3 text-gray-600">
        Villa kiralama süreci, ödeme, iptal koşulları ve konaklama hakkında merak
        edilenler.
      </p>

      <div className="mt-10 space-y-10">
        {categories.map((category) => {
          const items = faqs.filter((faq) => faq.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="text-xl font-semibold text-teal-800">
                {categoryLabels[category] ?? category}
              </h2>
              <div className="mt-4 space-y-3">
                {items.map((faq) => (
                  <details
                    key={faq.id}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <summary className="cursor-pointer font-medium text-gray-900">
                      {faq.question}
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
