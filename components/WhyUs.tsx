import { Headphones, ShieldCheck, Zap } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "En İyi Fiyat Garantisi",
    description:
      "Firmamız, sizlere en uygun fiyatlarla en yüksek kaliteyi sunma garantisi vermektedir.",
  },
  {
    icon: Zap,
    title: "Hızlı Rezervasyon & Satın Alma",
    description: "Hızlı ve kolay bir şekilde rezervasyon yapabilirsiniz.",
  },
  {
    icon: Headphones,
    title: "7/24 Müşteri Desteği",
    description:
      "Her zaman hizmetinizdeyiz, 7 gün 24 saat müşteri desteği sağlıyoruz.",
  },
];

export default function WhyUs() {
  return (
    <section id="neden-biz" className="bg-teal-950 py-12 text-white sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Neden Biz</h2>
          <p className="mt-2 text-teal-200">Harika Tatil Fırsatları Sunuyoruz!</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600">
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-teal-100/80">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
