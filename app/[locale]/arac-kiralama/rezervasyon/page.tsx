import Link from "next/link";
import Yolcu360BookingClient from "@/components/yolcu360/Yolcu360BookingClient";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Araç Kiralama Rezervasyon",
};

export const dynamic = "force-dynamic";

export default async function Yolcu360BookingPage() {
  const settings = await getYolcu360Settings();
  if (!settings.enabled || !settings.publicEnabled) {
    redirect("/arac-kiralama");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/arac-kiralama/sonuclar" className="text-sm font-semibold text-teal-700">
        ← Sonuçlara dön
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Rezervasyon bilgileri</h1>
      <div className="mt-6">
        <Yolcu360BookingClient />
      </div>
    </div>
  );
}
