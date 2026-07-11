import { notFound } from "next/navigation";
import type { Metadata } from "next";
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
      {page.excerpt ? <p className="mt-4 text-lg text-gray-600">{page.excerpt}</p> : null}
      <article
        className="prose prose-teal mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </main>
  );
}
