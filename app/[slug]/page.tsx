import { notFound } from "next/navigation";
import VillaDetailView from "@/components/villa-detail/VillaDetailView";
import { getActiveFaqsForPublic } from "@/lib/queries/cms-content";
import { getPublicExchangeRates } from "@/lib/exchange-rates";
import {
  getSimilarVillas,
  getVillaDetailBySlug,
} from "@/lib/queries/villa-detail";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { buildVillaDetailMetadata } from "@/lib/villa-page-metadata";
import { buildVillaLodgingJsonLd } from "@/lib/villa-json-ld";
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
  const [villa, company] = await Promise.all([
    getVillaDetailBySlug(slug),
    getCompanySettings(),
  ]);
  if (!villa) return { title: "Villa Bulunamadı" };
  const site = await getPublicSiteProfile(company);
  return buildVillaDetailMetadata(villa, site);
}

export default async function VillaDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const stayDates = resolveVillaStayDatesFromSearchParams(query);
  const initialAdults = resolveVillaStayAdultsFromSearchParams(query, 2);

  const [villa, faqs, company, exchangeRates] = await Promise.all([
    getVillaDetailBySlug(slug),
    getActiveFaqsForPublic(),
    getCompanySettings(),
    getPublicExchangeRates(),
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

  const site = await getPublicSiteProfile(company);
  const origin = `https://${site.domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "") || "www.tatildeyiz.com.tr"}`;
  const brandName = site.brandName?.trim() || company.brandName?.trim() || "";
  const lodgingJsonLd = buildVillaLodgingJsonLd({
    villa,
    brandName,
    origin,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(lodgingJsonLd),
        }}
      />
      <VillaDetailView
        villa={villa}
        similarVillas={similarVillas}
        companyPhone={company.phone || company.whatsapp || ""}
        brandName={brandName || undefined}
        exchangeRates={exchangeRates}
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
    </>
  );
}
