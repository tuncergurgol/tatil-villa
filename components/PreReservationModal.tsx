"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { validateCouponAction } from "@/app/actions/validate-coupon";
import TurkishPhoneField, {
  normalizeTurkishPhoneFieldValue,
} from "@/components/admin/ui/TurkishPhoneField";
import type { StayQuote } from "@/lib/stay-quote";

export type PreReservationPaymentMethod = "card" | "transfer";
export type PreReservationPaymentAmount = "prepayment" | "full";

export type PreReservationSubmitPayload = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  paymentMethod: PreReservationPaymentMethod;
  paymentAmount: PreReservationPaymentAmount;
  acceptTerms: boolean;
  acceptMarketing: boolean;
  couponCode?: string;
  couponDiscountAmount?: number;
  loyaltyVoucherId?: string;
  couponBalanceAmount?: number;
  memberDiscountLabel?: string;
};

export type PreReservationMemberBenefits = {
  loggedIn: boolean;
  guest?: {
    fullName: string;
    email: string;
    phone: string;
  };
  autoDiscount?: {
    amount: number;
    label: string;
    couponCode?: string;
    loyaltyVoucherId?: string;
    couponBalanceAmount?: number;
  };
};

type PreReservationModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: PreReservationSubmitPayload) => void;
  pending?: boolean;
  error?: string | null;
  villa: {
    name: string;
    code: string;
    image: string;
    guests: number;
    bedrooms: number;
    bathrooms: number;
  };
  guests: {
    adults: number;
    children: number;
    babies: number;
    pets: number;
  };
  quote: StayQuote;
  brandName?: string;
  memberBenefits?: PreReservationMemberBenefits | null;
};

function formatMoney(value: number) {
  return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}TL`;
}

function formatMoneyLira(value: number) {
  return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;
}

function RadioCard({
  selected,
  onSelect,
  title,
  description,
  price,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  price?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3.5 text-left transition ${
        selected
          ? "border-sky-400 bg-sky-50/40 ring-1 ring-sky-300"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-sky-500" : "border-slate-300"
        }`}
      >
        {selected ? (
          <span className="h-2 w-2 rounded-full bg-sky-500" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        {price ? (
          <span className="mt-1 block text-lg font-bold text-slate-900">
            {price}
          </span>
        ) : null}
        <span className="mt-1 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}

export default function PreReservationModal({
  open,
  onClose,
  onSubmit,
  pending = false,
  error = null,
  villa,
  guests,
  quote,
  brandName = "tatildeyiz",
  memberBenefits = null,
}: PreReservationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PreReservationPaymentMethod>("transfer");
  const [paymentAmount, setPaymentAmount] =
    useState<PreReservationPaymentAmount>("prepayment");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [hasCoupon, setHasCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [loyaltyVoucherId, setLoyaltyVoucherId] = useState("");
  const [couponBalanceAmount, setCouponBalanceAmount] = useState(0);
  const [memberDiscountLabel, setMemberDiscountLabel] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, setCouponPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (memberBenefits?.guest) {
      setGuestName(memberBenefits.guest.fullName);
      setGuestEmail(memberBenefits.guest.email);
      setGuestPhone(memberBenefits.guest.phone);
    }
    if (memberBenefits?.autoDiscount) {
      const discount = memberBenefits.autoDiscount;
      setHasCoupon(true);
      setCouponDiscountAmount(discount.amount);
      setCouponCode(discount.couponCode ?? "");
      setLoyaltyVoucherId(discount.loyaltyVoucherId ?? "");
      setCouponBalanceAmount(discount.couponBalanceAmount ?? 0);
      setMemberDiscountLabel(discount.label);
      setCouponError(null);
    }
  }, [open, memberBenefits]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, pending]);

  if (!open || !mounted) return null;

  const guestParts = [`${guests.adults} yetişkin`];
  if (guests.children > 0) guestParts.push(`${guests.children} çocuk`);
  if (guests.babies > 0) guestParts.push(`${guests.babies} bebek`);
  const guestLine = [
    guestParts.join(" · "),
    `${villa.bathrooms} Banyo`,
    `${villa.bedrooms} Yatak Odası`,
  ].join(" · ");

  const total = Math.max(0, quote.total - couponDiscountAmount);
  const prepayment = Math.max(0, quote.prepaymentAmount - couponDiscountAmount);
  const remainder = Math.max(0, quote.checkInPayment);
  const payNow =
    paymentAmount === "prepayment" ? prepayment : total;

  async function applyCoupon() {
    setCouponError(null);
    setCouponPending(true);
    try {
      const result = await validateCouponAction({
        code: couponCode,
        accommodationTotal: quote.accommodationTotal,
      });
      if (result.error || !result.discountAmount) {
        setCouponDiscountAmount(0);
        setLoyaltyVoucherId("");
        setCouponBalanceAmount(0);
        setMemberDiscountLabel("");
        setCouponError(result.error ?? "Kupon uygulanamadı");
        return;
      }
      setCouponDiscountAmount(result.discountAmount);
      setCouponCode(result.couponCode ?? couponCode);
      setLoyaltyVoucherId("");
      setCouponBalanceAmount(0);
      setMemberDiscountLabel("Üye kuponu");
    } finally {
      setCouponPending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    const name = guestName.trim();
    const email = guestEmail.trim();
    const phone = normalizeTurkishPhoneFieldValue(guestPhone);

    if (name.length < 2) {
      setLocalError("Lütfen ad soyad giriniz.");
      return;
    }
    if (!email.includes("@")) {
      setLocalError("Geçerli bir e-posta giriniz.");
      return;
    }
    if (phone.length < 12) {
      setLocalError("Geçerli bir telefon giriniz.");
      return;
    }
    if (!acceptTerms) {
      setLocalError(
        "Devam etmek için Aydınlatma Metni, Rezervasyon Sözleşmesi ve Üyelik Sözleşmesi’ni onaylamanız gerekir."
      );
      return;
    }

    onSubmit({
      guestName: name,
      guestEmail: email,
      guestPhone: phone,
      paymentMethod,
      paymentAmount,
      acceptTerms,
      acceptMarketing,
      couponCode:
        couponDiscountAmount > 0 && couponCode.trim()
          ? couponCode
          : undefined,
      couponDiscountAmount:
        couponDiscountAmount > 0 ? couponDiscountAmount : undefined,
      loyaltyVoucherId:
        couponDiscountAmount > 0 && loyaltyVoucherId
          ? loyaltyVoucherId
          : undefined,
      couponBalanceAmount:
        couponDiscountAmount > 0 && couponBalanceAmount > 0
          ? couponBalanceAmount
          : undefined,
      memberDiscountLabel:
        couponDiscountAmount > 0 ? memberDiscountLabel : undefined,
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-stretch justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      {/*
        Mobil: tek dikey scroll — overflow-hidden + panel içi scroll
        formu (Gönder) viewport altında bırakıyordu.
        lg+: yan yana paneller kendi içinde kayar.
      */}
      <div className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[min(94vh,900px)] sm:rounded-2xl lg:flex-row">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="absolute right-3 top-3 z-20 rounded-md bg-[#0b1b3a] p-2 text-white transition hover:bg-[#152a52] disabled:opacity-50"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:flex-row lg:overflow-hidden">
          {/* Sol panel */}
          <aside className="flex w-full shrink-0 flex-col gap-4 bg-[#0b1b3a] p-4 sm:p-5 lg:w-[42%] lg:max-w-md lg:overflow-y-auto lg:overscroll-contain">
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
              <div className="relative aspect-[16/11] bg-slate-200">
                {villa.image ? (
                  <Image
                    src={villa.image}
                    alt={villa.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 420px"
                  />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-3 pt-10 text-white">
                  <p className="text-lg font-bold tracking-wide">{villa.name}</p>
                  <p className="mt-0.5 text-xs text-white/85">{guestLine}</p>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between rounded-lg bg-[#f3ebe0] px-3 py-2.5">
                  <span className="text-sm font-medium text-slate-700">
                    Toplam Ödeme
                  </span>
                  <span className="text-base font-bold text-[#c45c26]">
                    {formatMoney(total)}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">
                      Ön Ödeme
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatMoney(prepayment)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    Rezervasyonu gerçekleştirmek için yapmanız gereken ön ödeme
                    tutarı
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">
                      Tesise Girişte
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatMoney(remainder)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    Ön ödeme sonrası yapmanız gereken kalan tutar girişte
                    alınacaktır.
                  </p>
                </div>
              </div>
            </div>

            {/* Resim 2 — ödeme seçimleri */}
            <div className="space-y-3 rounded-2xl bg-white p-3 shadow-lg sm:p-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <RadioCard
                  selected={paymentMethod === "transfer"}
                  onSelect={() => setPaymentMethod("transfer")}
                  title="Havale ya da EFT ile Ödeme"
                  description="Bu rezervasyonun ödemesini havale ya da EFT ile gerçekleştirmek istiyorum."
                />
                <RadioCard
                  selected={paymentMethod === "card"}
                  onSelect={() => setPaymentMethod("card")}
                  title="Kredi Kartı ile Ödeme"
                  description="Bu rezervasyonun ödemesini kredi kartı ile gerçekleştirmek istiyorum."
                />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <RadioCard
                  selected={paymentAmount === "prepayment"}
                  onSelect={() => setPaymentAmount("prepayment")}
                  title={`%${quote.prepaymentRate} Ön Ödeme Tutarı`}
                  price={formatMoneyLira(prepayment)}
                  description="Toplam tutarın sadece ön ödemesini yapmak istiyorum."
                />
                <RadioCard
                  selected={paymentAmount === "full"}
                  onSelect={() => setPaymentAmount("full")}
                  title="Tutarın Tamamı"
                  price={formatMoneyLira(total)}
                  description="Toplam tutarın tamamını yapmak istiyorum."
                />
              </div>
              <p className="text-center text-xs text-slate-500">
                Şimdi ödenecek:{" "}
                <span className="font-semibold text-slate-800">
                  {formatMoneyLira(payNow)}
                </span>
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={hasCoupon}
                    onChange={(event) => {
                      setHasCoupon(event.target.checked);
                      if (!event.target.checked) {
                        setCouponCode("");
                        setCouponDiscountAmount(0);
                        setLoyaltyVoucherId("");
                        setCouponBalanceAmount(0);
                        setMemberDiscountLabel("");
                        setCouponError(null);
                      }
                    }}
                  />
                  KUPONUM VAR
                </label>
                {hasCoupon ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                      placeholder="Kupon kodu"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponPending || !couponCode.trim()}
                      className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Uygula
                    </button>
                  </div>
                ) : null}
                {couponError ? (
                  <p className="mt-2 text-xs text-red-600">{couponError}</p>
                ) : null}
                {couponDiscountAmount > 0 ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    {memberDiscountLabel || "Üye indirimi"}: -
                    {formatMoneyLira(couponDiscountAmount)}
                  </p>
                ) : null}
                {memberBenefits?.loggedIn && memberBenefits.autoDiscount ? (
                  <p className="mt-2 text-xs text-teal-700">
                    Üye avantajınız otomatik uygulandı.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>

          {/* Sağ form */}
          <section className="flex min-h-0 flex-1 flex-col px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-8 lg:overflow-y-auto lg:overscroll-contain">
            <p className="text-sm font-medium text-[#e07a2f]">
              Şu an rezervasyon talebi oluşturuyorsunuz.
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0b1b3a] sm:text-3xl">
              Bilgilerinizi giriniz
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              Ön rezervasyon talebi alabilmemiz için lütfen rezervasyon sahibi
              bilgilerini giriniz.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-6 flex flex-1 flex-col"
            >
              <div className="space-y-3">
                <input
                  type="text"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="İsim Soyisim"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  placeholder="E-mail Adresiniz"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <TurkishPhoneField
                  hideLabel
                  required
                  value={guestPhone}
                  onChange={setGuestPhone}
                  placeholder="Telefon Numaranız"
                  focusPalette="blue"
                />
              </div>

              <div className="mt-5 space-y-3">
                <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-600">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => {
                      setAcceptTerms(event.target.checked);
                      if (event.target.checked) setLocalError(null);
                    }}
                    required
                    aria-required="true"
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-auto rounded border border-slate-300 text-sky-600 accent-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    <Link
                      href="/kurumsal/gizlilik-politikasi"
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni
                    </Link>
                    &apos;ni,{" "}
                    <Link
                      href="/kurumsal/online-rezervasyon-sozlesmesi"
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      Rezervasyon Sözleşmesi
                    </Link>
                    &apos;ni ve{" "}
                    <Link
                      href="/kurumsal/uyelik-sozlesmesi"
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      Üyelik Sözleşmesi
                    </Link>
                    &apos;ni okudum, anladım ve kabul ediyorum.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-600">
                  <input
                    type="checkbox"
                    checked={acceptMarketing}
                    onChange={(event) =>
                      setAcceptMarketing(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-auto rounded border border-slate-300 text-sky-600 accent-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    {brandName} tarafından haber ve kampanyalardan haberdar
                    edilmek istiyorum.{" "}
                    <Link
                      href="/kurumsal/gizlilik-politikasi"
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      Detaylı Bilgi
                    </Link>
                  </span>
                </label>
              </div>

              {(localError || error) && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {localError || error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-6 w-full rounded-xl bg-sky-600 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-70 lg:mt-auto"
              >
                {pending ? "Gönderiliyor..." : "Gönder"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
