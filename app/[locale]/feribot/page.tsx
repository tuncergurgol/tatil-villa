import type { Metadata } from "next";
import Link from "next/link";
import { Ship } from "lucide-react";
import CallbackRequestFormPublic from "@/components/corporate/CallbackRequestFormPublic";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const metadata: Metadata = {
  title: "Feribot",
  description:
    "Ada ve liman feribot geçişleriniz için bilgilendirme alın. Size özel güzergâh ve saat planı için bizi arayın.",
};

export const dynamic = "force-dynamic";

export default async function FeribotPage() {
  const company = await getCompanySettings();
  const whatsappDigits = (company.whatsapp || company.phone || "").replace(
    /\D/g,
    ""
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Feribot
        </p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          <Ship className="h-8 w-8 text-teal-700" />
          Ada ve liman geçişleri
        </h1>
        <p className="mt-3 text-slate-600">
          Feribot seferleri mevsime ve limana göre değişir. Güzergâh, tarih ve
          yolcu sayınızı iletin; ekibimiz uygun seçenekleri sizin için
          planlasın.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Bizi arayın</h2>
          <p className="mt-2 text-sm text-slate-600">
            Tercih ettiğiniz gün ve saat dilimini seçin; feribot talebinizi not
            olarak iletin.
          </p>
          <div className="mt-6">
            <CallbackRequestFormPublic />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
            <h2 className="text-base font-bold text-slate-900">
              Sık kullanılan hatlar
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Fethiye ↔ Rodos</li>
              <li>Bodrum ↔ Kos / Datça</li>
              <li>Çeşme ↔ Sakız (Chios)</li>
              <li>Ayvalık ↔ Midilli</li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Seferler ve bilet fiyatları operatör ve sezona göre değişir;
              kesin bilgi için talep formu veya WhatsApp kullanın.
            </p>
          </div>

          {whatsappDigits ? (
            <a
              href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
                "Merhaba, feribot geçişi için bilgi almak istiyorum."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              WhatsApp ile yazın
            </a>
          ) : null}

          <Link
            href="/vip-transfer"
            className="inline-flex w-full items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900 transition hover:bg-teal-100"
          >
            VIP Transfer talep et
          </Link>
        </aside>
      </div>
    </div>
  );
}
