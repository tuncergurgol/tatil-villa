import { notFound } from "next/navigation";
import VillaDetailView from "@/components/villa-detail/VillaDetailView";
import { getActiveFaqsForPublic } from "@/lib/queries/cms-content";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  getSimilarVillas,
  getVillaDetailBySlug,
} from "@/lib/queries/villa-detail";
import {
  resolveVillaStayAdultsFromSearchParams,
  resolveVillaStayDatesFromSearchParams,
} from "@/lib/villa-stay-url-params";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    giristarihi?: string | string[];
    cikistarihi?: string | string[];
    checkIn?: string | string[];
    checkOut?: string | string[];
    adults?: string | string[];
    kisi?: string | string[];
  }>;
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
    alternates: {
      canonical: `/${villa.slug}`,
    },
  };
}

export default async function VillaDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const stayDates = resolveVillaStayDatesFromSearchParams(query);
  const initialAdults = resolveVillaStayAdultsFromSearchParams(query, 2);

  const [villa, faqs, company] = await Promise.all([
    getVillaDetailBySlug(slug),
    getActiveFaqsForPublic(),
    getCompanySettings(),
  ]);

  if (!villa) notFound();

  const similarVillas = await getSimilarVillas(
    villa.id,
    villa.regionId,
    villa.guests,
    10
  );

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
      companyPhone={company.phone || company.whatsapp || ""}
      brandName={company.brandName?.trim() || undefined}
      initialCheckIn={stayDates?.checkIn ?? ""}
      initialCheckOut={stayDates?.checkOut ?? ""}
      initialAdults={initialAdults}
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
