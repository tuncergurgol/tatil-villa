import { Suspense } from "react";
import Link from "next/link";
import Yolcu360PaymentClient from "@/components/yolcu360/Yolcu360PaymentClient";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Araç Kiralama Ödeme",
};

export const dynamic = "force-dynamic";

export default async function Yolcu360PaymentPage() {
  const settings = await getYolcu360Settings();
  if (!settings.enabled || !settings.publicEnabled) {
    redirect("/arac-kiralama");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/arac-kiralama/rezervasyon"
        className="text-sm font-semibold text-teal-700"
      >
        ← Rezervasyona dön
      </Link>
      <div className="mt-6">
        <Suspense fallback={<p>Ödeme ekranı yükleniyor…</p>}>
          <Yolcu360PaymentClient />
        </Suspense>
      </div>
    </div>
  );
}
