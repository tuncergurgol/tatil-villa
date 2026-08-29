"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { BookingStatus } from "@prisma/client";
import {
  createAdminBookingAction,
  getAdminBookingWizardQuoteAction,
  getAdminBookingWizardVillasAction,
  type AdminBookingActionState,
} from "@/app/actions/admin/bookings";
import { lookupReturningGuestAdminAction } from "@/app/actions/returning-guest";
import StayDateRangePicker from "@/components/admin/availability/StayDateRangePicker";
import GuestCounterRow from "@/components/admin/bookings/new-booking/GuestCounterRow";
import NewBookingPriceSummary from "@/components/admin/bookings/new-booking/NewBookingPriceSummary";
import SelectedVillaCard from "@/components/admin/bookings/new-booking/SelectedVillaCard";
import { DiscountPercentAmountField } from "@/components/admin/bookings/booking-form-ui";
import ReturningGuestBanner from "@/components/member/ReturningGuestBanner";
import {
  clampDiscountRate,
  computeDiscountAmount,
  computeEntrancePayment,
  computeNetPrice,
  computePayableReservationTotal,
  computePrepaymentAmount,
} from "@/lib/booking-form-details";
import { getSortedCompanyPaymentTypeOptions } from "@/lib/company-payment-types";
import TcKimlikInput from "@/components/shared/TcKimlikInput";
import TurkishPhoneField, {
  normalizeTurkishPhoneFieldValue,
} from "@/components/admin/ui/TurkishPhoneField";
import type {
  AdminBookingWizardQuote,
  AdminBookingWizardVilla,
} from "@/lib/queries/admin-booking-wizard";
import { splitFullName, type ReturningGuestPreview } from "@/lib/returning-guest-shared";
import { isTcKimlikAcceptable } from "@/lib/tc-kimlik";
import { formatMoneyPlain } from "@/lib/booking-display";
import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";

interface BookingFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 1 | 2 | 3;
type PaymentMode = "prepayment" | "full";

const STEPS = [
  {
    id: 1 as const,
    title: "Tesis Seçimi",
    subtitle: "Rezervasyon yapılacak tesisi seçin",
  },
  {
    id: 2 as const,
    title: "Tarih & Misafir",
    subtitle: "Konaklama tarihleri ve fiyat",
  },
  {
    id: 3 as const,
    title: "Müşteri Bilgileri",
    subtitle: "İletişim bilgileri ve onay",
  },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100";

const labelClass = "text-sm font-semibold text-gray-800";

const initialState: AdminBookingActionState = {};

export default function BookingFormModal({
  open,
  onClose,
  onSuccess,
}: BookingFormModalProps) {
  const [state, formAction, isPending] = useActionState(
    createAdminBookingAction,
    initialState
  );

  const [step, setStep] = useState<WizardStep>(1);
  const [villas, setVillas] = useState<AdminBookingWizardVilla[]>([]);
  const [villasLoading, setVillasLoading] = useState(false);
  const [villaSearch, setVillaSearch] = useState("");
  const [selectedVilla, setSelectedVilla] =
    useState<AdminBookingWizardVilla | null>(null);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [pets, setPets] = useState(0);
  const [includeUnderfloorHeating, setIncludeUnderfloorHeating] = useState(false);
  const [ownerDiscountRate, setOwnerDiscountRate] = useState(0);
  const [ownerDiscountAmount, setOwnerDiscountAmount] = useState(0);
  const [agencyDiscountRate, setAgencyDiscountRate] = useState(0);
  const [agencyDiscountAmount, setAgencyDiscountAmount] = useState(0);
  const [quoteData, setQuoteData] = useState<AdminBookingWizardQuote | null>(
    null
  );
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestTc, setGuestTc] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("prepayment");
  const [customerNote, setCustomerNote] = useState("");
  const [returningGuest, setReturningGuest] =
    useState<ReturningGuestPreview | null>(null);
  const [loyaltyDiscountApplied, setLoyaltyDiscountApplied] = useState(false);

  useEffect(() => {
    if (state.success) {
      onSuccess();
      onClose();
    }
  }, [state.success, onClose, onSuccess]);

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setVillaSearch("");
    setSelectedVilla(null);
    setCheckIn("");
    setCheckOut("");
    setAdults(1);
    setChildren(0);
    setBabies(0);
    setPets(0);
    setIncludeUnderfloorHeating(false);
    setOwnerDiscountRate(0);
    setOwnerDiscountAmount(0);
    setAgencyDiscountRate(0);
    setAgencyDiscountAmount(0);
    setQuoteData(null);
    setGuestFirstName("");
    setGuestLastName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestTc("");
    setPaymentMethod("bank_transfer");
    setPaymentMode("prepayment");
    setCustomerNote("");
    setReturningGuest(null);
    setLoyaltyDiscountApplied(false);

    setVillasLoading(true);
    getAdminBookingWizardVillasAction()
      .then(setVillas)
      .catch(() => setVillas([]))
      .finally(() => setVillasLoading(false));
  }, [open]);

  useEffect(() => {
    if (!selectedVilla?.id || !checkIn || !checkOut) {
      setQuoteData(null);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);
    getAdminBookingWizardQuoteAction(selectedVilla.id, checkIn, checkOut)
      .then((data) => {
        if (!cancelled) setQuoteData(data);
      })
      .catch(() => {
        if (!cancelled) setQuoteData(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVilla?.id, checkIn, checkOut]);

  const guestName = `${guestFirstName.trim()} ${guestLastName.trim()}`.trim();
  const phoneValue = normalizeTurkishPhoneFieldValue(guestPhone);

  useEffect(() => {
    if (!open) return;
    const digits = normalizeTurkishPhoneDigits(phoneValue);
    const email = guestEmail.trim();
    if (digits.length < 10 && !email.includes("@")) {
      setReturningGuest(null);
      setLoyaltyDiscountApplied(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void lookupReturningGuestAdminAction({ phone: phoneValue, email }).then(
        (result) => {
          if (cancelled) return;
          const match = result.match;
          setReturningGuest(match);
          if (!match) {
            setLoyaltyDiscountApplied(false);
            return;
          }
          if (match.fullName) {
            const parts = splitFullName(match.fullName);
            setGuestFirstName((current) =>
              current.trim() ? current : parts.first
            );
            setGuestLastName((current) =>
              current.trim() ? current : parts.last
            );
          }
          if (!match.applyDiscount) {
            setLoyaltyDiscountApplied(false);
            return;
          }
          setAgencyDiscountRate((current) => {
            if (match.discountPercent <= current) {
              setLoyaltyDiscountApplied(true);
              return current;
            }
            const gross = quoteData?.quote?.valid
              ? quoteData.quote.accommodationTotal
              : null;
            setAgencyDiscountAmount(
              gross != null
                ? computeDiscountAmount(gross, match.discountPercent)
                : 0
            );
            setLoyaltyDiscountApplied(true);
            return match.discountPercent;
          });
        }
      );
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, phoneValue, guestEmail, quoteData]);

  const filteredVillas = useMemo(() => {
    const query = villaSearch.trim().toLocaleLowerCase("tr");
    if (!query) return villas;
    return villas.filter((villa) => {
      const haystack = `${villa.name} ${villa.location} ${villa.regionName}`
        .toLocaleLowerCase("tr");
      return haystack.includes(query);
    });
  }, [villaSearch, villas]);

  const pricingDetails = useMemo(() => {
    const quote = quoteData?.quote;
    const fees = quoteData?.fees;
    const grossPrice = quote?.valid ? quote.accommodationTotal : null;
    const cleaningFee = quote?.valid ? quote.cleaningFee : null;
    const underfloorHeatingFee = fees?.underfloorHeatingFee ?? null;
    const petCleaningFee = pets > 0 ? fees?.petCleaningFee ?? null : null;

    const details = {
      grossPrice,
      ownerDiscountRate,
      ownerDiscountAmount,
      agencyDiscountRate,
      agencyDiscountAmount,
      cleaningFee,
      underfloorHeatingFee: includeUnderfloorHeating
        ? underfloorHeatingFee
        : null,
      petCleaningFee,
      damageDeposit: quoteData?.damageDeposit ?? null,
    };

    const reservationTotal = computePayableReservationTotal(details);
    const netPrice = computeNetPrice(details);
    const prepaymentRate = quote?.prepaymentRate ?? 20;
    const formulaPrepayment = computePrepaymentAmount(
      grossPrice,
      ownerDiscountAmount,
      prepaymentRate,
      agencyDiscountAmount
    );
    const prepaymentAmount =
      paymentMode === "full" ? reservationTotal : formulaPrepayment;
    const entrancePayment = computeEntrancePayment(
      reservationTotal,
      prepaymentAmount
    );

    return {
      ...details,
      reservationTotal,
      netPrice,
      prepaymentRate,
      prepaymentAmount,
      entrancePayment,
      nights: quote?.nights ?? 0,
      quoteValid: quote?.valid ?? false,
    };
  }, [
    quoteData,
    includeUnderfloorHeating,
    pets,
    paymentMode,
    ownerDiscountRate,
    ownerDiscountAmount,
    agencyDiscountRate,
    agencyDiscountAmount,
  ]);

  const paymentTypeOptions = getSortedCompanyPaymentTypeOptions();

  if (!open) return null;

  const canContinueStep1 = Boolean(selectedVilla);
  const canContinueStep2 =
    Boolean(selectedVilla) &&
    Boolean(checkIn) &&
    Boolean(checkOut) &&
    pricingDetails.quoteValid &&
    adults >= 1;
  const canSubmitStep3 =
    guestFirstName.trim().length > 0 &&
    guestLastName.trim().length > 0 &&
    guestEmail.trim().length > 0 &&
    guestPhone.trim().length > 0 &&
    paymentMethod.trim().length > 0 &&
    isTcKimlikAcceptable(guestTc, false);

  function handleOwnerDiscountRateChange(rate: number) {
    const nextRate = clampDiscountRate(rate);
    const grossPrice = pricingDetails.grossPrice;
    setOwnerDiscountRate(nextRate);
    setOwnerDiscountAmount(
      grossPrice != null ? computeDiscountAmount(grossPrice, nextRate) : 0
    );
  }

  function handleAgencyDiscountRateChange(rate: number) {
    const nextRate = clampDiscountRate(rate);
    const grossPrice = pricingDetails.grossPrice;
    setAgencyDiscountRate(nextRate);
    setAgencyDiscountAmount(
      grossPrice != null ? computeDiscountAmount(grossPrice, nextRate) : 0
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[94vh] sm:max-w-5xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Yeni Rezervasyon</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {STEPS.map((item, index) => {
              const completed = step > item.id;
              const active = step === item.id;
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      completed
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {completed ? <Check className="h-4 w-4" /> : item.id}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-bold ${
                        active ? "text-blue-700" : "text-gray-800"
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">{item.subtitle}</p>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <div className="hidden flex-1 self-center md:block">
                      <div className="h-px bg-gray-200" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {step === 1 ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <h3 className="text-base font-bold text-gray-900">Tesis Seçimi</h3>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={villaSearch}
                  onChange={(event) => setVillaSearch(event.target.value)}
                  placeholder="Tesis adı veya bölge ara..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {villasLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Tesisler yükleniyor...
                </div>
              ) : filteredVillas.length > 0 ? (
                <div className="space-y-2">
                  {filteredVillas.map((villa) => (
                    <div
                      key={villa.id}
                      className={
                        selectedVilla?.id === villa.id
                          ? "rounded-xl ring-2 ring-blue-500"
                          : ""
                      }
                    >
                      <SelectedVillaCard
                        villa={villa}
                        selectable
                        onSelect={() => setSelectedVilla(villa)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                  Uygun tesis bulunamadı.
                </p>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                {selectedVilla ? (
                  <SelectedVillaCard
                    villa={selectedVilla}
                    onChange={() => setStep(1)}
                  />
                ) : null}

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-base font-bold text-gray-900">
                    Tarih & Misafir
                  </h3>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className={labelClass}>Giriş – Çıkış Tarihi</p>
                      <StayDateRangePicker
                        checkIn={checkIn}
                        checkOut={checkOut}
                        onChange={(nextCheckIn, nextCheckOut) => {
                          setCheckIn(nextCheckIn);
                          setCheckOut(nextCheckOut);
                        }}
                      />
                    </div>

                    <GuestCounterRow
                      label="Yetişkin"
                      hint="13 yaş ve üzeri"
                      value={adults}
                      min={1}
                      onChange={setAdults}
                    />
                    <GuestCounterRow
                      label="Çocuk"
                      hint="2-12 yaş"
                      value={children}
                      onChange={setChildren}
                    />
                    <GuestCounterRow
                      label="Bebek"
                      hint="0-2 yaş"
                      value={babies}
                      onChange={setBabies}
                    />
                    <GuestCounterRow
                      label="Evcil Hayvan"
                      hint="Pet temizlik bedeli uygulanır"
                      value={pets}
                      onChange={setPets}
                    />
                  </div>

                  {quoteLoading ? (
                    <p className="mt-4 text-sm text-gray-500">Fiyat hesaplanıyor...</p>
                  ) : null}
                  {!quoteLoading && checkIn && checkOut && !pricingDetails.quoteValid ? (
                    <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Seçilen tarihler için fiyat bulunamadı veya minimum konaklama
                      şartı sağlanmıyor.
                    </p>
                  ) : null}

                  {pricingDetails.quoteValid ? (
                    <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                      <h4 className="text-sm font-bold text-gray-900">
                        İndirimler
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <p className={labelClass}>Villa Sahibi İndirimi (% - Tutar)</p>
                          <div className="mt-1">
                            <DiscountPercentAmountField
                              rate={ownerDiscountRate}
                              amount={ownerDiscountAmount}
                              onRateChange={handleOwnerDiscountRateChange}
                              onAmountChange={(amount) =>
                                setOwnerDiscountAmount(amount ?? 0)
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <p className={labelClass}>Acente İndirimi (% - Tutar)</p>
                          <div className="mt-1">
                            <DiscountPercentAmountField
                              rate={agencyDiscountRate}
                              amount={agencyDiscountAmount}
                              onRateChange={handleAgencyDiscountRateChange}
                              onAmountChange={(amount) =>
                                setAgencyDiscountAmount(amount ?? 0)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <NewBookingPriceSummary
                checkIn={checkIn}
                checkOut={checkOut}
                adults={adults}
                children={children}
                babies={babies}
                accommodationTotal={pricingDetails.grossPrice}
                cleaningFee={pricingDetails.cleaningFee}
                underfloorHeatingFee={quoteData?.fees.underfloorHeatingFee ?? null}
                includeUnderfloorHeating={includeUnderfloorHeating}
                onToggleUnderfloorHeating={setIncludeUnderfloorHeating}
                reservationTotal={pricingDetails.reservationTotal}
                prepaymentAmount={pricingDetails.prepaymentAmount}
                prepaymentRate={pricingDetails.prepaymentRate}
                entrancePayment={pricingDetails.entrancePayment}
                damageDeposit={pricingDetails.damageDeposit}
                ownerDiscountAmount={pricingDetails.ownerDiscountAmount}
                agencyDiscountAmount={pricingDetails.agencyDiscountAmount}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                {selectedVilla ? (
                  <SelectedVillaCard
                    villa={selectedVilla}
                    onChange={() => setStep(1)}
                  />
                ) : null}

                <form
                  id="new-booking-form"
                  action={formAction}
                  className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <h3 className="text-base font-bold text-gray-900">
                    Müşteri Bilgileri
                  </h3>

                  <input type="hidden" name="status" value={BookingStatus.NEW} />
                  <input type="hidden" name="villaId" value={selectedVilla?.id ?? ""} />
                  <input type="hidden" name="checkIn" value={checkIn} />
                  <input type="hidden" name="checkOut" value={checkOut} />
                  <input type="hidden" name="adults" value={adults} />
                  <input type="hidden" name="children" value={children} />
                  <input type="hidden" name="babies" value={babies} />
                  <input type="hidden" name="pets" value={pets} />
                  <input type="hidden" name="guestName" value={guestName} />
                  <input type="hidden" name="guestEmail" value={guestEmail} />
                  <input type="hidden" name="guestPhone" value={phoneValue} />
                  <input type="hidden" name="grossPrice" value={pricingDetails.grossPrice ?? ""} />
                  <input
                    type="hidden"
                    name="ownerDiscountRate"
                    value={ownerDiscountRate}
                  />
                  <input
                    type="hidden"
                    name="ownerDiscountAmount"
                    value={ownerDiscountAmount}
                  />
                  <input
                    type="hidden"
                    name="agencyDiscountRate"
                    value={agencyDiscountRate}
                  />
                  <input
                    type="hidden"
                    name="agencyDiscountAmount"
                    value={agencyDiscountAmount}
                  />
                  <input
                    type="hidden"
                    name="prepaymentRate"
                    value={pricingDetails.prepaymentRate}
                  />
                  <input type="hidden" name="cleaningFee" value={pricingDetails.cleaningFee ?? ""} />
                  <input
                    type="hidden"
                    name="underfloorHeatingFee"
                    value={pricingDetails.underfloorHeatingFee ?? ""}
                  />
                  <input
                    type="hidden"
                    name="petCleaningFee"
                    value={pricingDetails.petCleaningFee ?? ""}
                  />
                  <input
                    type="hidden"
                    name="prepaymentAmount"
                    value={pricingDetails.prepaymentAmount ?? ""}
                  />
                  <input type="hidden" name="prepaymentMethod" value={paymentMethod} />
                  <input
                    type="hidden"
                    name="damageDeposit"
                    value={pricingDetails.damageDeposit ?? ""}
                  />
                  <input
                    type="hidden"
                    name="totalPrice"
                    value={
                      pricingDetails.reservationTotal ??
                      pricingDetails.netPrice ??
                      pricingDetails.grossPrice ??
                      ""
                    }
                  />
                  <input type="hidden" name="customerNote" value={customerNote} />
                  <input type="hidden" name="guestTc" value={guestTc} />

                  {returningGuest ? (
                    <div className="mb-4">
                      <ReturningGuestBanner
                        match={returningGuest}
                        variant="admin"
                        discountApplied={loyaltyDiscountApplied}
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>Ad *</span>
                      <input
                        value={guestFirstName}
                        onChange={(event) => setGuestFirstName(event.target.value)}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label>
                      <span className={labelClass}>Soyad *</span>
                      <input
                        value={guestLastName}
                        onChange={(event) => setGuestLastName(event.target.value)}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className={labelClass}>E-posta *</span>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(event) => setGuestEmail(event.target.value)}
                        className={inputClass}
                        required
                      />
                    </label>
                    <TurkishPhoneField
                      label="Telefon *"
                      value={guestPhone}
                      onChange={setGuestPhone}
                      focusPalette="blue"
                      required
                    />
                    <label>
                      <span className={labelClass}>T.C. Kimlik No (opsiyonel)</span>
                      <TcKimlikInput
                        value={guestTc}
                        onChange={setGuestTc}
                        focusPalette="blue"
                        className="mt-1 font-normal"
                        showError
                      />
                    </label>
                  </div>

                  <label>
                    <span className={labelClass}>Ödeme Yöntemi</span>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className={inputClass}
                    >
                      {paymentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <p className={labelClass}>Ödeme Tipi</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode("prepayment")}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          paymentMode === "prepayment"
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-900">Ön Ödeme</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {pricingDetails.prepaymentAmount != null
                            ? formatMoneyPlain(pricingDetails.prepaymentAmount)
                            : "—"}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode("full")}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          paymentMode === "full"
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-900">Tam Ödeme</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {pricingDetails.reservationTotal != null
                            ? formatMoneyPlain(pricingDetails.reservationTotal)
                            : "—"}
                        </p>
                      </button>
                    </div>
                  </div>

                  <label>
                    <span className={labelClass}>Müşteri Notu</span>
                    <textarea
                      value={customerNote}
                      onChange={(event) => setCustomerNote(event.target.value)}
                      rows={3}
                      className={inputClass}
                      placeholder="Opsiyonel talep veya not"
                    />
                  </label>

                  {state.error ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      {state.error}
                    </p>
                  ) : null}
                </form>
              </div>

              <NewBookingPriceSummary
                title="Rezervasyon Özeti"
                villaName={selectedVilla?.name}
                checkIn={checkIn}
                checkOut={checkOut}
                adults={adults}
                children={children}
                babies={babies}
                accommodationTotal={pricingDetails.grossPrice}
                cleaningFee={pricingDetails.cleaningFee}
                underfloorHeatingFee={quoteData?.fees.underfloorHeatingFee ?? null}
                includeUnderfloorHeating={includeUnderfloorHeating}
                reservationTotal={pricingDetails.reservationTotal}
                prepaymentAmount={pricingDetails.prepaymentAmount}
                prepaymentRate={pricingDetails.prepaymentRate}
                entrancePayment={pricingDetails.entrancePayment}
                damageDeposit={pricingDetails.damageDeposit}
                ownerDiscountAmount={pricingDetails.ownerDiscountAmount}
                agencyDiscountAmount={pricingDetails.agencyDiscountAmount}
                compact
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          {step === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              İptal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((current) => (current - 1) as WizardStep)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Devam
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}

          {step === 2 ? (
            <button
              type="button"
              disabled={!canContinueStep2}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Müşteri Bilgileri
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}

          {step === 3 ? (
            <button
              type="submit"
              form="new-booking-form"
              disabled={!canSubmitStep3 || isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Rezervasyonu Oluştur
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
