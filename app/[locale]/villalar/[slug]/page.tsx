import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Eski /villalar/[slug] → /[slug] kalıcı yönlendirme (query korunur) */
export default async function LegacyVillaDetailRedirect({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
    } else {
      qs.set(key, value);
    }
  }
  const suffix = qs.toString();
  permanentRedirect(suffix ? `/${slug}?${suffix}` : `/${slug}`);
}
