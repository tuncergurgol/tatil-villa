import type { ComponentType, ReactNode } from "react";
import { Clock, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/corporate/ContactForm";
import SocialIconLinks from "@/components/SocialIconLinks";
import { buildCompanySocialLinks } from "@/lib/social-links";
import {
  formatStoredTurkishPhoneDisplay,
  normalizeStoredTurkishPhone,
} from "@/lib/phone-utils";

export type ContactPageCompany = {
  brandName: string;
  address: string;
  email: string;
  phone: string;
  phone2: string;
  whatsapp: string;
  workingHours: string;
  googleMapsEmbed: string;
  instagram: string;
  facebook: string;
  twitter: string;
  youtube: string;
};

function extractMapEmbedSrc(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http")) return trimmed;
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
  return srcMatch?.[1] ?? null;
}

function telHref(phone: string) {
  const normalized = normalizeStoredTurkishPhone(phone);
  return `tel:${normalized || phone.replace(/[^\d+]/g, "")}`;
}

function displayPhone(phone: string) {
  return formatStoredTurkishPhoneDisplay(phone) || phone;
}

export default function ContactPageView({
  company,
}: {
  company: ContactPageCompany;
}) {
  const mapSrc = extractMapEmbedSrc(company.googleMapsEmbed);
  const brandName = company.brandName.trim() || "tatildeyiz.com.tr";
  const phones = [company.phone, company.phone2].filter((p) => p.trim());
  const socials = buildCompanySocialLinks(company);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-8 text-center sm:px-8 sm:py-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          İletişim
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Yardım / Destek{" "}
          {phones[0] ? (
            <a
              href={telHref(phones[0])}
              className="font-semibold text-teal-700 hover:text-teal-800"
            >
              {displayPhone(phones[0])}
            </a>
          ) : (
            <span className="font-semibold text-teal-700">bize yazın</span>
          )}
        </p>
      </div>

      {mapSrc ? (
        <div className="relative h-[280px] w-full bg-slate-100 sm:h-[360px]">
          <iframe
            title="Ofis konumu"
            src={mapSrc}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center bg-slate-100 text-sm text-slate-500">
          Harita henüz tanımlanmadı
        </div>
      )}

      <div className="grid gap-10 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-8">
          <InfoBlock title="Adres" icon={MapPin}>
            {company.address ? (
              <p className="text-sm leading-relaxed text-slate-700">
                {company.address}
              </p>
            ) : null}
            {company.email ? (
              <span
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                dangerouslySetInnerHTML={{
                  __html: `<!--email_off--><a href="mailto:${company.email}" class="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800">${company.email}</a><!--email_on-->`,
                }}
              />
            ) : null}
          </InfoBlock>

          <InfoBlock title="Telefon" icon={Phone}>
            <div className="space-y-1.5">
              {phones.map((phone) => (
                <a
                  key={phone}
                  href={telHref(phone)}
                  className="block text-sm font-semibold text-slate-800 hover:text-teal-700"
                >
                  {displayPhone(phone)}
                </a>
              ))}
              {company.whatsapp.trim() ? (
                <a
                  href={`https://wa.me/${normalizeStoredTurkishPhone(company.whatsapp).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  WhatsApp: {displayPhone(company.whatsapp)}
                </a>
              ) : null}
              {phones.length === 0 && !company.whatsapp.trim() ? (
                <p className="text-sm text-slate-500">Telefon tanımlı değil</p>
              ) : null}
            </div>
          </InfoBlock>

          <InfoBlock title="Çalışma Saatlerimiz" icon={Clock}>
            <p className="text-sm leading-relaxed text-slate-700">
              {company.workingHours.trim() || "09:00 - 23:59"}
            </p>
          </InfoBlock>

          {socials.length > 0 ? (
            <InfoBlock title="Sosyal Medya'da">
              <SocialIconLinks links={socials} />
            </InfoBlock>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 sm:p-6">
          <ContactForm brandName={brandName} />
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {Icon ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
