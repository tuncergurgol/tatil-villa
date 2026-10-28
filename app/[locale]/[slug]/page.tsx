import { permanentRedirect } from "next/navigation";
import { preconnect } from "react-dom";
import { getLocale } from "next-intl/server";
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
import { convertCurrencyAmount } from "@/lib/currency-conversion";
import { buildVillaLodgingJsonLd } from "@/lib/villa-json-ld";
import { encodeGalleryImageUrl } from "@/lib/encode-gallery-image-url";
import { preloadOptimizedLcpImage } from "@/lib/preload-lcp-image";
import {
  resolveVillaStayAdultsFromSearchParams,
  resolveVillaStayDatesFromSearchParams,
  resolveVillaStayGuestCountsFromSearchParams,
  shouldResumeVillaStayRequest,
} from "@/lib/villa-stay-url-params";
import {
  verifyUndocumentedVillaBookingAccessToken,
} from "@/lib/undocumented-villa-booking-access";
import { hasVillaTourismDocument } from "@/lib/villa-document-types";
import { localizeFaqContent } from "@/lib/i18n/faq-en-translations";
import { localizeReviewContent } from "@/lib/i18n/review-en-translations";
import { generateVillaDescriptionTemplate } from "@/lib/villa-description-generator";
import { buildVillaDescriptionContextFromDetail } from "@/lib/villa-description-from-detail";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    giristarihi?: string | string[];
    cikistarihi?: string | string[];
    checkIn?: string | string[];
    checkOut?: string | string[];
    adults?: string | string[];
    kisi?: string | string[];
    children?: string | string[];
    cocuk?: string | string[];
    babies?: string | string[];
    bebek?: string | string[];
    pets?: string | string[];
    evcil?: string | string[];
    talep?: string | string[];
    rez?: string | string[];
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const villa = await getVillaDetailBySlug(slug, site.key);
  if (!villa) {
    permanentRedirect("/villalar");
  }
  return buildVillaDetailMetadata(villa, site, { locale });
}

export default async function VillaDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const stayDates = resolveVillaStayDatesFromSearchParams(query);
  const initialGuests = resolveVillaStayGuestCountsFromSearchParams(query, 2);
  const initialAdults =
    initialGuests.adults || resolveVillaStayAdultsFromSearchParams(query, 2);
  const resumeBookingRequest = shouldResumeVillaStayRequest(query);

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const locale = await getLocale();

  const [villaRaw, faqs, exchangeRates] = await Promise.all([
    getVillaDetailBySlug(slug, site.key),
    getActiveFaqsForPublic(),
    getPublicExchangeRates(),
  ]);

  if (!villaRaw) {
    permanentRedirect("/villalar");
  }

  const villa =
    locale === "tr"
      ? villaRaw
      : {
          ...villaRaw,
          description: generateVillaDescriptionTemplate(
            buildVillaDescriptionContextFromDetail(villaRaw),
            locale
          ),
          reviews: villaRaw.reviews.map((review) => {
            const localized = localizeReviewContent(review, locale);
            return {
              ...review,
              title: localized.title,
              comment: localized.comment,
            };
          }),
        };

  const rawAccessToken = query.rez;
  const bookingAccessToken = Array.isArray(rawAccessToken)
    ? rawAccessToken[0] ?? ""
    : rawAccessToken ?? "";
  const allowBookingAccess =
    hasVillaTourismDocument({
      documentNo: villa.documentNo,
      documentType: villa.documentType,
    }) ||
    verifyUndocumentedVillaBookingAccessToken(bookingAccessToken, villa.id);

  const similarVillas = await getSimilarVillas(
    villa.id,
    villa.regionId,
    villa.guests,
    12,
    site.key
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

  const origin = `https://${site.domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "") || "www.tatildeyiz.com.tr"}`;
  const brandName = site.brandName?.trim() || company.brandName?.trim() || "";
  const todayKey = new Date().toISOString().slice(0, 10);
  const currentPeriod = villaRaw.periods.find((period) => {
    const start = period.startDate.slice(0, 10);
    const end = period.endDate.slice(0, 10);
    return start <= todayKey && todayKey <= end;
  });
  const nightly =
    (currentPeriod?.discountedNightlyPrice &&
    currentPeriod.discountedNightlyPrice > 0
      ? currentPeriod.discountedNightlyPrice
      : currentPeriod?.nightlyPrice) || villaRaw.pricePerNight;
  const nightlyCurrency = currentPeriod?.currency || "TL";
  const lodgingJsonLd = buildVillaLodgingJsonLd({
    villa,
    brandName,
    origin,
    brandOgImage: site.ogImageUrl,
    locale,
    minStayNights: currentPeriod?.minStayNights ?? null,
    offers:
      nightly && nightly > 0
        ? (["TL", "EUR", "GBP"] as const).map((currency) => ({
            price: convertCurrencyAmount(
              nightly,
              nightlyCurrency,
              currency,
              exchangeRates
            ),
            priceCurrency: currency === "TL" ? "TRY" : currency,
          }))
        : undefined,
  });
  const heroImage = villa.images[0]
    ? encodeGalleryImageUrl(villa.images[0])
    : null;

  if (heroImage) {
    if (heroImage.startsWith("https://") || heroImage.startsWith("http://")) {
      const origin = new URL(heroImage).origin;
      if (!origin.includes("tatildeyiz.com.tr") && !origin.includes("localhost")) {
        preconnect(origin);
      }
    }
    preloadOptimizedLcpImage(heroImage, "(min-width: 640px) 50vw, 100vw", 70);
  }

  return (
    <>
      {lodgingJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(lodgingJsonLd),
          }}
        />
      ) : null}
      <VillaDetailView
        villa={villa}
        siteKey={site.key}
        similarVillas={similarVillas}
        companyPhone={company.phone || company.whatsapp || ""}
        brandName={brandName || undefined}
        exchangeRates={exchangeRates}
        initialCheckIn={stayDates?.checkIn ?? ""}
        initialCheckOut={stayDates?.checkOut ?? ""}
        initialAdults={initialAdults}
        initialChildren={initialGuests.children}
        initialBabies={initialGuests.babies}
        initialPets={initialGuests.pets}
        resumeBookingRequest={resumeBookingRequest}
        bookingAccessToken={
          allowBookingAccess &&
          !hasVillaTourismDocument({
            documentNo: villa.documentNo,
            documentType: villa.documentType,
          })
            ? bookingAccessToken
            : ""
        }
        allowBookingAccess={allowBookingAccess}
        faqs={(detailFaqs.length > 0 ? detailFaqs : faqs.slice(0, 8)).map(
          (faq) => {
            const localized = localizeFaqContent(
              faq.slug,
              faq.question,
              faq.answer,
              locale
            );
            return {
              id: faq.id,
              question: localized.question,
              answer: localized.answer,
            };
          }
        )}
      />
    </>
  );
}
