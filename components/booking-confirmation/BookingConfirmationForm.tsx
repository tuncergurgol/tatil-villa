"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Info, Loader2, Building2, User } from "lucide-react";
import { confirmBookingGuestInfoAction } from "@/app/actions/booking-confirmation";
import BookingConfirmationExtras from "@/components/booking-confirmation/BookingConfirmationExtras";
import ConfettiBurst from "@/components/celebration/ConfettiBurst";
import type { PublicConfirmationBooking } from "@/lib/queries/booking-confirmation";
import { formatPrice } from "@/lib/utils";
import {
  getDistrictsByProvince,
  getTurkeyProvinces,
  type TurkeyProvince,
} from "@/lib/mernis-ilce";
import {
  isTcKimlikAcceptable,
  normalizeTcKimlik,
} from "@/lib/tc-kimlik";

type SerializableConfirmationBooking = Omit<
  PublicConfirmationBooking,
  "checkIn" | "checkOut"
> & {
  checkIn: string;
  checkOut: string;
};

type GuestFormRow = {
  name: string;
  surname: string;
  nationality: string;
  identityNumber: string;
};

type InvoiceType = "individual" | "corporate";

const NATIONALITY_OPTIONS = [
  { value: "TC", label: "TC (Türkiye Cumhuriyeti)" },
  { value: "DE", label: "Almanya" },
  { value: "GB", label: "İngiltere" },
  { value: "NL", label: "Hollanda" },
  { value: "RU", label: "Rusya" },
  { value: "OTHER", label: "Diğer" },
];

const COUNTRY_OPTIONS = [
  { value: "TR", label: "Türkiye" },
  { value: "DE", label: "Almanya" },
  { value: "GB", label: "İngiltere" },
  { value: "NL", label: "Hollanda" },
  { value: "OTHER", label: "Diğer" },
];

const inputClass =
  "peer w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 pb-2.5 pt-6 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100";

const labelClass =
  "pointer-events-none absolute left-4 top-2 text-xs font-medium text-slate-500";

const PROVINCES: TurkeyProvince[] = getTurkeyProvinces();

function normalizeTrLabel(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveInitialProvince(city: string): TurkeyProvince | null {
  const needle = normalizeTrLabel(city);
  if (!needle) return null;
  return (
    PROVINCES.find((p) => normalizeTrLabel(p.ilAdi) === needle) ?? null
  );
}

function resolveInitialDistrict(
  province: TurkeyProvince | null,
  district: string
): string {
  if (!province) return "";
  const needle = normalizeTrLabel(district);
  if (!needle) return "";
  const match = getDistrictsByProvince(province.ilKodu).find(
    (d) => normalizeTrLabel(d.ilceAdi) === needle
  );
  return match?.ilceAdi ?? "";
}

/** Daha önce gerçekten kaydedilmiş tüzel fatura var mı? (misafir/adres prefill sayılmaz) */
function hasSavedCorporateInvoice(details: SerializableConfirmationBooking["details"]): boolean {
  if (details.taxpayerType !== "corporate") return false;
  const taxOffice = details.invoiceTaxOffice?.trim() ?? "";
  const taxNumber = details.invoiceTaxNumber?.trim() ?? "";
  const title = details.invoiceTitle?.trim() ?? "";
  if (taxOffice) return true;
  if (/^\d{10}$/.test(taxNumber) && title) return true;
  return false;
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="relative">
      {children}
      <label className={labelClass}>{label}</label>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function toInitialGuests(
  booking: SerializableConfirmationBooking
): GuestFormRow[] {
  return booking.guests.map((guest, index) => {
    const surname = (guest.surname ?? "").trim();
    const rawName = (guest.name ?? "").trim();
    let name = rawName;
    let resolvedSurname = surname;

    if (surname && rawName.endsWith(surname) && rawName.length > surname.length) {
      name = rawName.slice(0, -surname.length).trim() || rawName;
    } else if (!surname && rawName.includes(" ")) {
      const parts = rawName.split(/\s+/).filter(Boolean);
      resolvedSurname = parts.length > 1 ? parts[parts.length - 1]! : "";
      name = parts.length > 1 ? parts.slice(0, -1).join(" ") : rawName;
    }

    const isPrimary = index === 0;
    return {
      name,
      surname: resolvedSurname,
      nationality: isPrimary ? guest.nationality || "TC" : "",
      identityNumber: isPrimary ? guest.nationalId || "" : "",
    };
  });
}

export default function BookingConfirmationForm({
  booking,
  mail,
}: {
  booking: SerializableConfirmationBooking;
  mail?: string;
}) {
  const [guests, setGuests] = useState<GuestFormRow[]>(() =>
    toInitialGuests(booking)
  );
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(() =>
    booking.details.taxpayerType === "corporate" ? "corporate" : "individual"
  );
  // Varsayılan kapalı — müşteri ihtiyaçta açar
  const [useDifferentInvoice, setUseDifferentInvoice] = useState(false);
  const [country, setCountry] = useState(() => {
    const raw = booking.details.guestCountry?.trim() || "TR";
    if (/^türkiye$/i.test(raw) || raw === "TR") return "TR";
    return (
      COUNTRY_OPTIONS.find((o) => o.value === raw || o.label === raw)?.value ??
      "OTHER"
    );
  });
  const [address, setAddress] = useState(booking.details.guestAddress ?? "");
  const [provinceCode, setProvinceCode] = useState<number | "">(() => {
    return resolveInitialProvince(booking.details.guestCity ?? "")?.ilKodu ?? "";
  });
  const [city, setCity] = useState(() => {
    const matched = resolveInitialProvince(booking.details.guestCity ?? "");
    return matched?.ilAdi ?? (booking.details.guestCity ?? "");
  });
  const [district, setDistrict] = useState(() => {
    const matched = resolveInitialProvince(booking.details.guestCity ?? "");
    return (
      resolveInitialDistrict(matched, booking.details.guestDistrict ?? "") ||
      (booking.details.guestDistrict ?? "")
    );
  });
  const [companyName, setCompanyName] = useState(() =>
    hasSavedCorporateInvoice(booking.details)
      ? (booking.details.invoiceTitle ?? "")
      : ""
  );
  const [taxNumber, setTaxNumber] = useState(() =>
    hasSavedCorporateInvoice(booking.details)
      ? (booking.details.invoiceTaxNumber ?? "")
      : ""
  );
  const [taxOffice, setTaxOffice] = useState(() =>
    hasSavedCorporateInvoice(booking.details)
      ? (booking.details.invoiceTaxOffice ?? "")
      : ""
  );
  const [companyAddress, setCompanyAddress] = useState(() =>
    hasSavedCorporateInvoice(booking.details)
      ? (booking.details.invoiceAddress ?? "")
      : ""
  );
  const [invoiceFirstName, setInvoiceFirstName] = useState("");
  const [invoiceLastName, setInvoiceLastName] = useState("");
  const [invoiceIdentityNumber, setInvoiceIdentityNumber] = useState(
    booking.details.invoiceTaxNumber ?? ""
  );
  const [invoiceAddress, setInvoiceAddress] = useState(
    booking.details.invoiceAddress ?? ""
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
  }, []);

  const districts = useMemo(
    () =>
      typeof provinceCode === "number"
        ? getDistrictsByProvince(provinceCode)
        : [],
    [provinceCode]
  );

  const isTurkey = country === "TR";

  const checkInLabel = useMemo(
    () =>
      new Date(booking.checkIn).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [booking.checkIn]
  );
  const checkOutLabel = useMemo(
    () =>
      new Date(booking.checkOut).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [booking.checkOut]
  );

  function updateGuest(index: number, patch: Partial<GuestFormRow>) {
    setGuests((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function validateClient(): string | null {
    const nextErrors: Record<string, string> = {};

    if (!country.trim()) nextErrors.country = "Ülke seçimi gerekli.";
    if (!city.trim()) nextErrors.city = "İl seçimi gerekli.";
    if (!district.trim()) nextErrors.district = "İlçe seçimi gerekli.";
    if (!address.trim() || address.trim().length < 3) {
      nextErrors.address = "Adres bilgisi gerekli.";
    }

    for (const [index, guest] of guests.entries()) {
      if (index > 0) continue;
      const isTc = guest.nationality === "TC";
      const id = guest.identityNumber.trim();
      if (!guest.nationality.trim()) {
        nextErrors[`guest-${index}-nationality`] = "Uyruğu seçimi gerekli.";
      }
      if (!id) {
        nextErrors[`guest-${index}-id`] = isTc
          ? "TC kimlik numarası gerekli."
          : "Kimlik / pasaport numarası gerekli.";
      } else if (isTc && !isTcKimlikAcceptable(id, true)) {
        nextErrors[`guest-${index}-id`] =
          "Geçerli bir TC kimlik numarası giriniz.";
      }
    }

    setFieldErrors(nextErrors);
    const first = Object.values(nextErrors)[0];
    return first ?? null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      return;
    }

    startTransition(async () => {
      const result = await confirmBookingGuestInfoAction({
        rezId: booking.rezId,
        mail: mail || undefined,
        invoiceType,
        useDifferentInvoice,
        country,
        address,
        city,
        district,
        companyName,
        taxNumber,
        taxOffice,
        companyAddress,
        invoiceFirstName,
        invoiceLastName,
        invoiceIdentityNumber,
        invoiceAddress,
        guests: guests.map((guest, index) => ({
          name: guest.name,
          surname: guest.surname,
          nationality: index === 0 ? guest.nationality : "",
          identityNumber:
            index === 0
              ? guest.nationality === "TC"
                ? normalizeTcKimlik(guest.identityNumber)
                : guest.identityNumber.trim()
              : "",
        })),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setShowCelebration(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (booking.alreadyConfirmed || success) {
    const isFreshSuccess = success && !booking.alreadyConfirmed;
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
        <div className="relative mx-auto w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          {showCelebration ? (
            <ConfettiBurst onComplete={handleCelebrationComplete} />
          ) : null}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            {isFreshSuccess
              ? "Rezervasyonunuz Onaylandı"
              : "Rezervasyonunuz Önceden Onaylanmıştır"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {isFreshSuccess
              ? "Teşekkürler. Konfirme belgeniz e-posta ve WhatsApp üzerinden gönderilmiştir. İyi tatiller dileriz."
              : "Bu rezervasyonunuz için müşteri bilgilerini daha önce tamamladınız. Tatilinize hazır mısınız?"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Rezervasyon No:{" "}
            <span className="font-semibold">{booking.rezId}</span>
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
          >
            Ana Sayfaya Dön
          </Link>
        </div>

        <BookingConfirmationExtras />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.95fr)_minmax(0,1.55fr)] lg:items-start">
      <aside className="order-first rounded-2xl bg-slate-100 p-5 sm:p-6 lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Konaklama Bilgileri
        </h2>
        {booking.villaImage ? (
          <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-xl">
            <Image
              src={booking.villaImage}
              alt={booking.villaName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 320px"
            />
          </div>
        ) : null}
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          {booking.villaName}
        </h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Rezervasyon Kodu:</dt>
            <dd className="font-semibold text-slate-900">{booking.rezId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Giriş Tarihi:</dt>
            <dd className="font-semibold text-slate-900">{checkInLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Çıkış Tarihi:</dt>
            <dd className="font-semibold text-slate-900">{checkOutLabel}</dd>
          </div>
          {booking.nights > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Gece Sayısı:</dt>
              <dd className="font-semibold text-slate-900">
                {booking.nights} Gece
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Misafir Sayısı:</dt>
            <dd className="font-semibold text-slate-900">
              {booking.adults} Yetişkin
            </dd>
          </div>
          {booking.children > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Çocuk:</dt>
              <dd className="font-semibold text-slate-900">
                {booking.children}
              </dd>
            </div>
          ) : null}
          {booking.babies > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Bebek:</dt>
              <dd className="font-semibold text-slate-900">{booking.babies}</dd>
            </div>
          ) : null}
          {booking.totalPrice != null ? (
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-3">
              <dt className="text-slate-500">Toplam Tutar:</dt>
              <dd className="font-semibold text-slate-900">
                {formatPrice(booking.totalPrice)}
              </dd>
            </div>
          ) : null}
          {booking.prepaymentAmount > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Ön ödeme:</dt>
              <dd className="font-semibold text-slate-900">
                {formatPrice(booking.prepaymentAmount)}
              </dd>
            </div>
          ) : null}
        </dl>
      </aside>

      <div className="rounded-2xl bg-white p-5 shadow-md sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Rezervasyon Onayı
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Güvenli form
          </span>
        </div>

        <div className="mb-8 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/80 px-4 py-4 sm:px-5">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Önemli Uyarı
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Konaklama yerinde{" "}
                <strong>
                  tüm misafirlerin kimlik belgelerini ibraz etmeleri gerekmektedir
                </strong>
                . Lütfen tüm misafirlerinizin (yetişkin ve çocuk) kimlik
                belgelerini yanlarında bulundurmalarını sağlayınız.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Müşteri Bilgileri
            </h2>
            <div className="space-y-8">
              {guests.map((guest, index) => {
                const isPrimary = index === 0;
                const isTc = guest.nationality === "TC";
                return (
                  <div
                    key={index}
                    className={index > 0 ? "border-t border-slate-100 pt-8" : ""}
                  >
                    <h3 className="mb-4 text-base font-semibold text-slate-800">
                      {isPrimary ? (
                        <>
                          Rezervasyon Sahibi{" "}
                          <span className="text-red-500">*</span>
                        </>
                      ) : (
                        `${index + 1}. Misafir`
                      )}
                    </h3>
                    <div
                      className={`grid gap-4 sm:grid-cols-2 ${
                        isPrimary ? "lg:grid-cols-3" : ""
                      }`}
                    >
                      <Field label="Adı *">
                        <input
                          required
                          value={guest.name}
                          onChange={(e) =>
                            updateGuest(index, { name: e.target.value })
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Soyadı *">
                        <input
                          required
                          value={guest.surname}
                          onChange={(e) =>
                            updateGuest(index, { surname: e.target.value })
                          }
                          className={inputClass}
                        />
                      </Field>
                      {isPrimary ? (
                        <>
                          <Field
                            label={
                              isTc
                                ? "TC Kimlik Numarası *"
                                : "Kimlik / Pasaport Numarası *"
                            }
                            error={fieldErrors[`guest-${index}-id`]}
                          >
                            <input
                              required
                              value={guest.identityNumber}
                              inputMode={isTc ? "numeric" : "text"}
                              maxLength={isTc ? 11 : 32}
                              onChange={(e) =>
                                updateGuest(index, {
                                  identityNumber: isTc
                                    ? normalizeTcKimlik(e.target.value)
                                    : e.target.value,
                                })
                              }
                              className={inputClass}
                            />
                          </Field>
                          <Field
                            label="Uyruğu *"
                            error={fieldErrors[`guest-${index}-nationality`]}
                          >
                            <select
                              required
                              value={guest.nationality}
                              onChange={(e) =>
                                updateGuest(index, {
                                  nationality: e.target.value,
                                  identityNumber:
                                    e.target.value === "TC"
                                      ? normalizeTcKimlik(guest.identityNumber)
                                      : guest.identityNumber,
                                })
                              }
                              className={inputClass}
                            >
                              {NATIONALITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Rezervasyon Sahibi Adres Bilgileri
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ülke *" error={fieldErrors.country}>
                <select
                  required
                  value={country}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCountry(next);
                    if (next === "TR") {
                      const matched = resolveInitialProvince(city);
                      setProvinceCode(matched?.ilKodu ?? "");
                      if (matched) setCity(matched.ilAdi);
                    } else {
                      setProvinceCode("");
                    }
                  }}
                  className={inputClass}
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="İl *" error={fieldErrors.city}>
                {isTurkey ? (
                  <select
                    required
                    value={provinceCode}
                    onChange={(e) => {
                      const value = e.target.value;
                      const code = value ? Number(value) : "";
                      setProvinceCode(code);
                      const selected =
                        typeof code === "number"
                          ? PROVINCES.find((p) => p.ilKodu === code)
                          : null;
                      setCity(selected?.ilAdi ?? "");
                      setDistrict("");
                    }}
                    className={inputClass}
                  >
                    <option value="">İl seçin</option>
                    {PROVINCES.map((province) => (
                      <option key={province.ilKodu} value={province.ilKodu}>
                        {province.ilAdi}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                  />
                )}
              </Field>
              <Field label="İlçe *" error={fieldErrors.district}>
                {isTurkey ? (
                  <select
                    required
                    value={district}
                    disabled={!provinceCode}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">İlçe seçin</option>
                    {districts.map((item) => (
                      <option key={item.code} value={item.ilceAdi}>
                        {item.ilceAdi}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={inputClass}
                  />
                )}
              </Field>
              <div className="sm:col-span-2">
                <Field label="Adres *" error={fieldErrors.address}>
                  <textarea
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`${inputClass} min-h-[96px] resize-y`}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-8">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Fatura Bilgileri
            </h2>
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={invoiceType === "individual"}
                onClick={() => {
                  setInvoiceType("individual");
                  setUseDifferentInvoice(false);
                }}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition ${
                  invoiceType === "individual"
                    ? "border-teal-500 bg-teal-50/60"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <User className="h-5 w-5 text-teal-700" />
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Gerçek Kişi
                  </span>
                  <span className="text-xs text-slate-500">
                    Bireysel fatura düzenlenecek
                  </span>
                </span>
              </button>
              <button
                type="button"
                aria-pressed={invoiceType === "corporate"}
                onClick={() => {
                  setInvoiceType("corporate");
                  if (!hasSavedCorporateInvoice(booking.details)) {
                    setCompanyName("");
                    setTaxNumber("");
                    setTaxOffice("");
                    setCompanyAddress("");
                  }
                }}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition ${
                  invoiceType === "corporate"
                    ? "border-teal-500 bg-teal-50/60"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <Building2 className="h-5 w-5 text-teal-700" />
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Tüzel Kişi
                  </span>
                  <span className="text-xs text-slate-500">
                    Kurumsal fatura düzenlenecek
                  </span>
                </span>
              </button>
            </div>

            {invoiceType === "corporate" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Şirket Ünvanı *">
                  <input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Vergi Numarası *">
                  <input
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={taxNumber}
                    onChange={(e) =>
                      setTaxNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Vergi Dairesi *">
                  <input
                    required
                    value={taxOffice}
                    onChange={(e) => setTaxOffice(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Şirket Adresi *">
                    <textarea
                      required
                      rows={3}
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className={`${inputClass} min-h-[96px] resize-y`}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setUseDifferentInvoice((v) => !v)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    useDifferentInvoice
                      ? "bg-teal-600 text-white"
                      : "border border-teal-300 text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {useDifferentInvoice
                    ? "Fatura bilgilerim farklı (aktif)"
                    : "Fatura bilgilerim farklı"}
                </button>
                <p className="text-xs text-slate-500">
                  {useDifferentInvoice
                    ? "Aşağıdaki bilgilerle fatura düzenlenecektir."
                    : "Varsayılan olarak rezervasyon sahibi bilgileriyle fatura düzenlenir."}
                </p>
                {useDifferentInvoice ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Ad *">
                      <input
                        required
                        value={invoiceFirstName}
                        onChange={(e) => setInvoiceFirstName(e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Soyad *">
                      <input
                        required
                        value={invoiceLastName}
                        onChange={(e) => setInvoiceLastName(e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="TC Kimlik Numarası *">
                      <input
                        required
                        inputMode="numeric"
                        maxLength={11}
                        value={invoiceIdentityNumber}
                        onChange={(e) =>
                          setInvoiceIdentityNumber(
                            normalizeTcKimlik(e.target.value)
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Fatura Adresi *">
                        <textarea
                          required
                          rows={3}
                          value={invoiceAddress}
                          onChange={(e) => setInvoiceAddress(e.target.value)}
                          className={`${inputClass} min-h-[96px] resize-y`}
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex min-h-[60px] w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-4 text-center text-sm font-bold leading-snug text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Güncelleniyor...
              </span>
            ) : (
              <span>
                Mailime gelen tüm bilgileri, detayları ve ekli dosyaları okudum,
                anladım ve <strong>ONAYLIYORUM.</strong>
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
