import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { getBiletallPageContext } from "@/lib/biletall-page";

export const metadata: Metadata = {
  title: "Uçak / Otobüs Bileti Ara",
  description:
    "Uçak ve otobüs bileti ara, karşılaştır ve güvenle satın al — Tatildeyiz.",
};

export const dynamic = "force-dynamic";

export default async function BiletAraPage() {
  const { enabled, portalSlug, credentials, routes, publicOrigin, publicHomeUrl } =
    await getBiletallPageContext();
  if (!enabled) redirect("/");

  return (
    <BiletShell
      title="Uçak / Otobüs Bileti Ara"
      description="Uçak veya otobüs seferlerini arayın, uygun bileti bulun ve güvenle satın alın."
      activeKind="ara"
      homeUrl={publicHomeUrl}
      size="large"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-5">
        {!credentials.username || !credentials.password ? (
          <p className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-base text-amber-900 sm:text-lg">
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
          enlarged
        />
      </div>
    </BiletShell>
  );
}
