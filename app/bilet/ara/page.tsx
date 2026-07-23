import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { getBiletallPageContext } from "@/lib/biletall-page";

export const metadata: Metadata = {
  title: "Bilet Ara",
  description: "Uçak ve otobüs bileti ara — Biletall entegrasyonu.",
};

export const dynamic = "force-dynamic";

export default async function BiletAraPage() {
  const { enabled, portalSlug, credentials, routes, publicOrigin, publicHomeUrl } =
    await getBiletallPageContext();
  if (!enabled) redirect("/ucak-otobus");

  return (
    <BiletShell
      title="Bilet Ara"
      description="Uçak veya otobüs seferlerini arayın, uygun bileti bulun."
      activeKind="ara"
      homeUrl={publicHomeUrl}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        {!credentials.username || !credentials.password ? (
          <p className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Bilet arama şu an yapılandırılıyor. Kısa süre içinde tekrar deneyin veya
            müşteri hizmetlerimizle iletişime geçin.
          </p>
        ) : null}
        <BiletallIframe
          kind="ara"
          portalSlug={portalSlug}
          credentials={credentials}
          routes={routes}
          publicOrigin={publicOrigin}
          title="Biletall — Bilet Ara"
        />
      </div>
    </BiletShell>
  );
}
