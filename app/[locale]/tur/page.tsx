import type { Metadata } from "next";
import TursabRotaEmbed from "@/components/tur/TursabRotaEmbed";
import TursabRotaShell from "@/components/tur/TursabRotaShell";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { resolveTursabRotaWhiteLabelUrl } from "@/lib/tursab-rota";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  return {
    title: "Tur Rezervasyonu",
    description: `Yurt içi ve yurt dışı tur paketlerini ${site.brandName} üzerinden güvenle inceleyin ve rezervasyon yapın.`,
    alternates: {
      canonical: "/tur",
    },
  };
}

export default async function TurPage() {
  const settings = await getCompanySettings();
  const whiteLabelUrl = resolveTursabRotaWhiteLabelUrl(
    settings.tursabWhiteLabelUrl
  );

  return (
    <TursabRotaShell>
      <TursabRotaEmbed url={whiteLabelUrl} />
    </TursabRotaShell>
  );
}
