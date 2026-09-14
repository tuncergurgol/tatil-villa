import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OtelzLandingPage from "@/components/otel/OtelzLandingPage";
import OtelzShell from "@/components/otel/OtelzShell";
import { resolveOtelzSalesPage } from "@/lib/otelz";
import { getOtelzPageContext } from "@/lib/otelz-page";

export const metadata: Metadata = {
  title: "Otel Rezervasyonu",
  description:
    "Türkiye genelinde otel arayın, karşılaştırın ve Otelz güvencesiyle rezervasyon yapın.",
};

export const dynamic = "force-dynamic";

type OtelPageProps = {
  searchParams: Promise<{ kategori?: string }>;
};

export default async function OtelPage({ searchParams }: OtelPageProps) {
  const { enabled, affiliate, salesPages, bannerUrl } = await getOtelzPageContext();
  if (!enabled) redirect("/");

  const params = await searchParams;
  const activePageMeta = resolveOtelzSalesPage(params.kategori);
  const activePage =
    salesPages.find((page) => page.id === activePageMeta.id) ?? salesPages[0]!;

  return (
    <OtelzShell
      title="Otel Rezervasyonu"
      description="En uygun otelleri arayın, erken rezervasyon ve saatlik oda seçeneklerini keşfedin."
      activePageId={activePage.id}
      homeUrl="/"
    >
      <OtelzLandingPage
        affiliate={affiliate}
        activePage={activePage}
        bannerUrl={bannerUrl}
      />
    </OtelzShell>
  );
}
