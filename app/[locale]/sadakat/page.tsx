import Link from "next/link";
import { LOYALTY_TIER_META } from "@/lib/loyalty-config";

export default function SadakatProgramPage() {
  return (
    <main className="bg-slate-50">
      <section className="bg-gradient-to-br from-teal-700 to-emerald-800 px-4 py-16 text-white sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Konakladıkça, Paylaştıkça Kazanın
          </h1>
          <p className="mt-4 text-lg text-teal-50">
            Her tatiliniz sizi bir üst üyelik seviyesine taşır, her davetiniz kupon
            kazandırır.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/uye"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-teal-800 hover:bg-teal-50"
            >
              Üye Ol
            </Link>
            <Link
              href="/villalar"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Villaları Keşfet
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
        {[
          {
            title: "Üyelik Seviyesi & Sadakat Çeki",
            text: "Tamamlanan her konaklama sizi Bronz'dan Platin'e taşır. Seviyenize göre %5'e varan indirim çeki kazanırsınız.",
          },
          {
            title: "Davet Et, Kazan",
            text: "Arkadaşlarınız 1.000 TL hoş geldin hediyesiyle başlar; siz konaklama tamamlandığında ödül alırsınız.",
          },
          {
            title: "Kupon Bakiyesi",
            text: "Davet ödülleri tek bakiyede birikir ve sonraki rezervasyonlarınızda kullanılabilir.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {item.text}
            </p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Üyelik Seviyeleri</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["BRONZE", "SILVER", "GOLD", "PLATINUM"] as const).map((tier) => {
            const meta = LOYALTY_TIER_META[tier];
            return (
              <div
                key={tier}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
              >
                <p className="text-3xl">{meta.emoji}</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {meta.label}
                </p>
                <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
                {meta.voucherPercent > 0 ? (
                  <p className="mt-3 text-sm font-semibold text-teal-700">
                    %{meta.voucherPercent} indirim çeki
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
