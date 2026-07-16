import CallbackRequestFormPublic from "@/components/corporate/CallbackRequestFormPublic";

const STEPS = [
  {
    title: "1. Form",
    text: "Telefon ve tercihinizi yazın.",
  },
  {
    title: "2. Doğrulama kodu",
    text: "5 haneli kodu WhatsApp mesajından alın.",
  },
  {
    title: "3. Biz ararız",
    text: "Doğrulama sonrası sizi arıyoruz.",
  },
] as const;

export default function CallbackRequestPageView() {
  return (
    <section className="relative min-w-0 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#ff7b54]/25 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-[#0d7377]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-[#14919b]/15 blur-3xl" />
      </div>

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0a3d4a] via-[#0d5c63] to-[#14919b] px-6 py-12 text-white shadow-xl sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #ff9f1c 0%, transparent 45%), radial-gradient(circle at 80% 70%, #fff 0%, transparent 40%)",
          }}
          aria-hidden
        />
        <p className="relative text-sm font-semibold tracking-wide text-[#ffbf69]">
          Ücretsiz geri arama
        </p>
        <h1 className="relative mt-3 max-w-2xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Sizi Arayalım
        </h1>
        <p className="relative mt-4 max-w-xl text-base text-white/85 sm:text-lg">
          Formu doldurun, WhatsApp ile gelen kodu girin — uzman ekibimiz size
          en uygun villayı bulup arasın.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-3 text-sm text-white/80">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9f1c]" />
            5 haneli doğrulama
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
            Aynı gün dönüş
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[1.75rem] border border-[#0d5c63]/12 bg-white/95 px-5 py-7 shadow-[0_20px_50px_-24px_rgba(10,61,74,0.35)] sm:px-8 sm:py-9">
          <h2 className="text-xl font-bold text-[#0a3d4a]">Bizi arayalım mı?</h2>
          <p className="mt-2 text-sm text-[#1a4a5c]/75">
            Bilgilerinizi bırakın; telefonunuzu doğruladıktan sonra talebiniz
            ekibimize düşer.
          </p>
          <div className="mt-6">
            <CallbackRequestFormPublic />
          </div>
        </div>

        <aside className="space-y-3">
          {STEPS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[#0d5c63]/10 bg-gradient-to-br from-white to-[#e8f6f5] px-4 py-4"
            >
              <h3 className="text-sm font-bold text-[#0a3d4a]">{item.title}</h3>
              <p className="mt-0.5 text-sm text-[#1a4a5c]/75">{item.text}</p>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
