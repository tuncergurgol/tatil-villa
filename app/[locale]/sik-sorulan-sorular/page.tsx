import type { Metadata } from "next";
import {
  getActiveFaqsForPublic,
  getFaqCategoriesForPublic,
} from "@/lib/queries/cms-content";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  maybeRewriteVillaWording,
  usesTesisListingCopy,
} from "@/lib/public-listing-copy";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  return {
    title: "Sık Sorulan Sorular",
    description: maybeRewriteVillaWording(
      "Villa kiralama, rezervasyon, ödeme, iptal ve konaklama hakkında sık sorulan sorular ve cevapları.",
      site.key
    ),
  };
}

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
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const [faqs, categories] = await Promise.all([
    getActiveFaqsForPublic(),
    getFaqCategoriesForPublic(),
  ]);
  const tesis = usesTesisListingCopy(site.key);

  const rewrittenFaqs = faqs.map((faq) => ({
    ...faq,
    question: maybeRewriteVillaWording(faq.question, site.key),
    answer: maybeRewriteVillaWording(faq.answer, site.key),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: rewrittenFaqs.map((faq) => ({
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
        {maybeRewriteVillaWording(
          "Villa kiralama süreci, ödeme, iptal koşulları ve konaklama hakkında merak edilenler.",
          site.key
        )}
      </p>

      <div className="mt-10 space-y-10">
        {categories.map((category) => {
          const items = rewrittenFaqs.filter((faq) => faq.category === category);
          if (items.length === 0) return null;
          const label = categoryLabels[category] ?? category;
          return (
            <section key={category}>
              <h2 className="text-xl font-semibold text-teal-800">
                {tesis ? maybeRewriteVillaWording(label, site.key) : label}
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
