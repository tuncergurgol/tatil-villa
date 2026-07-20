import Image from "next/image";
import { Phone } from "lucide-react";
import BookingGuestLoginForm from "@/components/booking-guest-login/BookingGuestLoginForm";
import {
  formatStoredTurkishPhoneDisplay,
  normalizeStoredTurkishPhone,
} from "@/lib/phone-utils";

type Props = {
  brandName: string;
  logoUrl?: string;
  phone?: string;
};

function telHref(phone: string) {
  const normalized = normalizeStoredTurkishPhone(phone);
  return `tel:${normalized || phone.replace(/[^\d+]/g, "")}`;
}

function displayPhone(phone: string) {
  const formatted = formatStoredTurkishPhoneDisplay(phone);
  return formatted === "-" ? phone : formatted;
}

export default function BookingGuestLoginPageView({
  brandName,
  logoUrl,
  phone,
}: Props) {
  const phoneLabel = phone ? displayPhone(phone) : null;

  return (
    <section className="relative min-h-[70vh] overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(10,61,74,0.35)] sm:min-h-[560px]">
      <div className="grid min-h-[inherit] lg:grid-cols-2">
        <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0a3d4a] via-[#0d5c63] to-[#14919b] px-7 py-10 text-white sm:px-10 sm:py-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 22%, transparent 0 72px, rgba(255,255,255,0.12) 73px 74px, transparent 75px), radial-gradient(circle at 78% 68%, transparent 0 110px, rgba(255,255,255,0.1) 111px 112px, transparent 113px), radial-gradient(circle at 88% 18%, transparent 0 56px, rgba(255,191,105,0.18) 57px 58px, transparent 59px)",
            }}
          />
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/15"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full border border-white/10"
            aria-hidden
          />

          <div className="relative">
            {logoUrl ? (
              <div className="mb-8 inline-flex max-w-[220px] rounded-xl bg-white/95 px-3 py-2 shadow-sm">
                <Image
                  src={logoUrl}
                  alt={brandName}
                  width={200}
                  height={64}
                  className="h-10 w-auto object-contain sm:h-12"
                  priority
                />
              </div>
            ) : null}
            <p className="text-sm font-semibold tracking-wide text-[#ffbf69]">
              Misafir alanı
            </p>
            <h1 className="mt-3 max-w-md font-serif text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Rezervasyon Takip
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85 sm:text-base">
              Rezervasyonunuzu takip etmek için giriş yapın. Size özel
              bilgilendirmeleri kaçırmayın.
            </p>
          </div>

          {phoneLabel ? (
            <div className="relative mt-10 border-t border-white/15 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                Müşteri Hizmetleri
              </p>
              <a
                href={telHref(phone!)}
                className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-white transition hover:text-[#ffbf69]"
              >
                <Phone className="h-4 w-4 shrink-0 opacity-80" />
                {phoneLabel}
              </a>
            </div>
          ) : null}
        </aside>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-12">
          <h2 className="text-2xl font-bold tracking-tight text-[#0a3d4a] sm:text-3xl">
            Hoş Geldiniz
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Rezervasyon detaylarınızı görüntülemek için bilgilerinizi giriniz.
          </p>

          <div className="mt-8">
            <BookingGuestLoginForm />
          </div>

          <div className="mt-6 rounded-xl border-l-4 border-[#e85d04] bg-[#fff4eb] px-4 py-3 text-sm leading-relaxed text-slate-700">
            Bu alana giriş yapabilmek için konfirme edilmiş bir
            rezervasyonunuz olmalıdır. Henüz onaylanmamış rezervasyonlar için
            lütfen müşteri hizmetlerimizle iletişime geçiniz.
          </div>
        </div>
      </div>
    </section>
  );
}
