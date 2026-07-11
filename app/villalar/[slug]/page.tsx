import { notFound } from "next/navigation";
import VillaDetailView from "@/components/villa-detail/VillaDetailView";
import { getActiveFaqsForPublic } from "@/lib/queries/cms-content";
import {
  getSimilarVillas,
  getVillaDetailBySlug,
} from "@/lib/queries/villa-detail";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const villa = await getVillaDetailBySlug(slug);
  if (!villa) return { title: "Villa Bulunamadı" };
  return {
    title: villa.seoTitle || villa.name,
    description:
      villa.seoDescription ||
      villa.description.replace(/<[^>]*>/g, " ").trim(),
    keywords: villa.seoKeywords
      ? villa.seoKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : undefined,
  };
}

export default async function VillaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [villa, faqs] = await Promise.all([
    getVillaDetailBySlug(slug),
    getActiveFaqsForPublic(),
  ]);

  if (!villa) notFound();

  const similarVillas = await getSimilarVillas(villa.id, villa.regionId, 8);

  const detailFaqs = faqs
    .filter((faq) => {
      const category = faq.category.toLocaleLowerCase("tr");
      return (
        category.includes("villa") ||
        category.includes("genel") ||
        category.includes("rezervasyon")
      );
    })
    .slice(0, 10);

  return (
    <VillaDetailView
      villa={villa}
      similarVillas={similarVillas}
      faqs={(detailFaqs.length > 0 ? detailFaqs : faqs.slice(0, 8)).map(
        (faq) => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
        })
      )}
    />
  );
}
