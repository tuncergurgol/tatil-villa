import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import CallbackRequestPageView from "@/components/corporate/CallbackRequestPageView";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Sizi Arayalım",
    description:
      "Ücretsiz geri arama formu. Telefonunuzu doğrulayın, villa uzmanlarımız sizi arasın.",
    alternates: buildPublicAlternates(locale, "/sizi-arayalim"),
  };
}

export default function SiziArayalimPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <CallbackRequestPageView />
    </div>
  );
}
