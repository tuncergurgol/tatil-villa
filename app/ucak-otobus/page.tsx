import type { Metadata } from "next";
import { getCompanySettings } from "@/lib/queries/company-settings";
import UcakOtobusLanding from "./UcakOtobusLanding";

export const metadata: Metadata = {
  title: "Uçak / Otobüs",
  description:
    "Uçak, otobüs bileti ve PNR sorgulama — tatil planını burada başlat, biletini de burada al.",
};

export const dynamic = "force-dynamic";

export default async function UcakOtobusPage() {
  const settings = await getCompanySettings();

  return <UcakOtobusLanding enabled={settings.biletallEnabled ?? true} />;
}
