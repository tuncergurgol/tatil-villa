import Link from "next/link";
import Yolcu360ResultsClient from "@/components/yolcu360/Yolcu360ResultsClient";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Araç Kiralama Sonuçları",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Yolcu360ResultsPage({ searchParams }: PageProps) {
  const settings = await getYolcu360Settings();
  if (!settings.enabled || !settings.publicEnabled) {
    redirect("/arac-kiralama");
  }

  const params = await searchParams;
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") normalized[key] = value;
  }

  if (!normalized.pickupPlaceId || !normalized.checkInDate || !normalized.checkOutDate) {
    redirect("/arac-kiralama");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/arac-kiralama" className="text-sm font-semibold text-teal-700">
        ← Yeni arama
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Uygun araçlar</h1>
      <div className="mt-6">
        <Yolcu360ResultsClient searchParams={normalized} />
      </div>
    </div>
  );
}
