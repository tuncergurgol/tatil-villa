export type BreadcrumbLdItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbListJsonLd(
  origin: string,
  items: BreadcrumbLdItem[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

export function buildFaqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>
) {
  if (faqs.length === 0) return null;
  return {
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
}

export function buildCollectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  origin: string;
  items: Array<{ name: string; path: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: `${input.origin}${input.path}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${input.origin}${item.path}`,
        name: item.name,
      })),
    },
  };
}
