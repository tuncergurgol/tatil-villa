import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import ContactPageView from "@/components/corporate/ContactPageView";
import CorporateHtmlContent from "@/components/CorporateHtmlContent";
import CorporatePageSidebar from "@/components/CorporatePageSidebar";
import { injectCmsCopyButtons } from "@/lib/cms-copy-buttons";
import {
  getCorporateMenuPages,
  getPublishedCmsPage,
} from "@/lib/queries/cms-content";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  applyContractBrandDomain,
  RESERVATION_CONTRACT_SLUG,
} from "@/lib/reservation-document-contract";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "sizi-arayalim") {
    return {
      title: "Sizi Arayalım",
      description:
        "Ücretsiz geri arama formu. Telefonunuzu doğrulayın, villa uzmanlarımız sizi arasın.",
    };
  }
  const page = await getPublishedCmsPage(slug);
  if (!page) return { title: "Sayfa Bulunamadı" };

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.excerpt || undefined,
  };
}

export default async function CorporatePage({ params }: Props) {
  const { slug } = await params;
  if (slug === "sizi-arayalim") {
    redirect("/sizi-arayalim");
  }

  const [page, menuItems, company] = await Promise.all([
    getPublishedCmsPage(slug),
    getCorporateMenuPages(),
    getCompanySettings(),
  ]);
  if (!page) notFound();

  const site = await getPublicSiteProfile(company);

  if (slug === "iletisim") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <CorporatePageSidebar currentSlug={slug} items={menuItems} />
          </aside>
          <ContactPageView
            company={{
              brandName: company.brandName,
              address: company.address,
              email: company.email,
              phone: company.phone,
              phone2: company.phone2,
              whatsapp: company.whatsapp,
              workingHours: company.workingHours,
              googleMapsEmbed: company.googleMapsEmbed,
              instagram: company.instagram,
              facebook: company.facebook,
              twitter: company.twitter,
              youtube: company.youtube,
            }}
          />
        </div>
      </div>
    );
  }

  let contentHtml =
    slug === "banka-bilgilerimiz"
      ? injectCmsCopyButtons(page.content)
      : page.content;

  if (slug === RESERVATION_CONTRACT_SLUG) {
    contentHtml = applyContractBrandDomain(contentHtml, site.domain);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <CorporatePageSidebar currentSlug={slug} items={menuItems} />
        </aside>

        <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {page.title}
          </h1>
          {page.excerpt ? (
            <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
              {page.excerpt}
            </p>
          ) : null}
          <CorporateHtmlContent html={contentHtml} />
        </section>
      </div>
    </div>
  );
}
