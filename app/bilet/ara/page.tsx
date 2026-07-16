import type { Metadata } from "next";
import BiletallIframe from "@/components/bilet/BiletallIframe";
import BiletShell from "@/components/bilet/BiletShell";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const metadata: Metadata = {
  title: "Bilet Ara",
  description: "Uçak ve otobüs bileti ara — Biletall entegrasyonu.",
};

export const dynamic = "force-dynamic";

export default async function BiletAraPage() {
  const settings = await getCompanySettings();

  return (
    <BiletShell
      title="Bilet Ara"
      description="Uçak veya otobüs seferlerini arayın, uygun bileti bulun."
    >
      <BiletallIframe
        kind="ara"
        portalSlug={settings.biletallPortalSlug}
        title="Biletall — Bilet Ara"
      />
    </BiletShell>
  );
}
