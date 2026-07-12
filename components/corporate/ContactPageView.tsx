import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/corporate/ContactForm";
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

function socialHref(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("@")) return `https://instagram.com/${value.slice(1)}`;
  return value;
}

function SocialGlyph({
  kind,
  className,
}: {
  kind: "instagram" | "facebook" | "x" | "youtube";
  className?: string;
}) {
  if (kind === "instagram") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <rect width="20" height="20" x="2" y="2" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1z" />
      </svg>
    );
  }
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function ContactPageView({
  company,
}: {
  company: ContactPageCompany;
}) {
  const mapSrc = extractMapEmbedSrc(company.googleMapsEmbed);
  const brandName = company.brandName.trim() || "tatildeyiz.com.tr";
  const phones = [company.phone, company.phone2].filter((p) => p.trim());
  const socials = [
    {
      href: socialHref(company.instagram),
      label: "Instagram",
      kind: "instagram" as const,
    },
    {
      href: socialHref(company.facebook),
      label: "Facebook",
      kind: "facebook" as const,
    },
    { href: socialHref(company.twitter), label: "X", kind: "x" as const },
    {
      href: socialHref(company.youtube),
      label: "YouTube",
      kind: "youtube" as const,
    },
  ].filter((item) => item.href);

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
              <a
                href={`mailto:${company.email}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
              >
                <Mail className="h-3.5 w-3.5" />
                {company.email}
              </a>
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
              <div className="flex flex-wrap gap-2">
                {socials.map(({ href, label, kind }) => (
                  <Link
                    key={label}
                    href={href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <SocialGlyph kind={kind} className="h-4 w-4" />
                  </Link>
                ))}
              </div>
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
