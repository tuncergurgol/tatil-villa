import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CorporateHtmlContent from "@/components/CorporateHtmlContent";
import CorporatePageSidebar from "@/components/CorporatePageSidebar";
import { injectCmsCopyButtons } from "@/lib/cms-copy-buttons";
import { getPublishedCmsPage } from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedCmsPage(slug);
  if (!page) return { title: "Sayfa Bulunamadı" };

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.excerpt || undefined,
  };
}

export default async function CorporatePage({ params }: Props) {
  const { slug } = await params;
  const page = await getPublishedCmsPage(slug);
  if (!page) notFound();

  const contentHtml = injectCmsCopyButtons(page.content);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <CorporatePageSidebar currentSlug={slug} />
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
