import Link from "next/link";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Rezervasyon Tamamlandı",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Yolcu360SuccessPage({ searchParams }: PageProps) {
  const settings = await getYolcu360Settings();
  if (!settings.enabled || !settings.publicEnabled) {
    redirect("/arac-kiralama");
  }

  const params = await searchParams;
  const orderID =
    typeof params.orderID === "string"
      ? params.orderID
      : typeof params.orderId === "string"
        ? params.orderId
        : "";
  const status = typeof params.status === "string" ? params.status : "success";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
        <h1 className="text-2xl font-bold text-emerald-900">
          {status === "success" ? "Rezervasyon alındı" : "İşlem tamamlandı"}
        </h1>
        {orderID ? (
          <p className="mt-3 text-sm text-emerald-800">
            Sipariş referansı: <strong>{orderID}</strong>
          </p>
        ) : null}
        <p className="mt-3 text-sm text-emerald-800/90">
          Onay detayları e-posta adresinize iletilecektir.
        </p>
        <Link
          href="/arac-kiralama"
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Yeni arama yap
        </Link>
      </div>
    </div>
  );
}
