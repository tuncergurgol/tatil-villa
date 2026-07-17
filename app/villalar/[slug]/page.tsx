import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Eski /villalar/[slug] → /[slug] kalıcı yönlendirme */
export default async function LegacyVillaDetailRedirect({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}
