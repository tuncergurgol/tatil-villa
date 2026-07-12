"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Baby, Loader2, PawPrint, Share2, User, Users, X } from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { BookingStatus as BookingStatusEnum } from "@prisma/client";
import { StayStatus, STAY_STATUS_OPTIONS } from "@/lib/stay-status";
import {
  getBookingDetailAction,
  getBookingPeriodFeesAction,
  getBookingPrepaymentRateAction,
  getSiteInfoOptionsAction,
  updateBookingDetailAction,
} from "@/app/actions/admin/bookings";
import { BOOKING_STATUS_META } from "@/lib/booking-status";
import {
  type BookingDetailRecord,
  type BookingDetails,
  type BookingExtraFeeFieldKey,
  type BookingGuestEntry,
  type BookingPrepaymentRecord,
  BOOKING_EXTRA_FEE_FIELDS,
  DEFAULT_BOOKING_SITE_INFO,
  TAXPAYER_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  buildGuestRows,
  clampDiscountRate,
  computeBalance,
  computeCheckInPayment,
  computeCommissionAmount,
  computeDiscountAmount,
  computeNetPrice,
  computePrepaymentAmount,
  defaultDetailsFromBooking,
  dedupeSiteInfoNames,
  parseBookingDetails,
  formatBookingDate,
  formatFeeInputValue,
  getNightCount,
  normalizeBookingSiteInfo,
  resolveExternalCode,
  toDateInputValue,
} from "@/lib/booking-form-details";
import {
  getSortedCompanyPaymentTypeOptions,
  normalizeCompanyPaymentType,
} from "@/lib/company-payment-types";
import {
  FormRow,
  FormSection,
  ReadonlyField,
  DiscountPercentAmountField,
  bookingInputClass,
  bookingReadonlyClass,
} from "@/components/admin/bookings/booking-form-ui";
import PrepaymentShareModal from "@/components/admin/bookings/PrepaymentShareModal";
import BookingKonfirmeTab from "@/components/admin/bookings/BookingKonfirmeTab";
import OptionCountdown from "@/components/admin/bookings/OptionCountdown";
import TcKimlikInput from "@/components/shared/TcKimlikInput";
import TurkishPhoneField, {
  normalizeTurkishPhoneFieldValue,
} from "@/components/admin/ui/TurkishPhoneField";
import {
  isTcKimlikAcceptable,
  validateOptionalTcKimlikFields,
} from "@/lib/tc-kimlik";

interface BookingDetailModalProps {
  bookingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const BOOKING_DETAIL_TABS = [
  { id: "rezervasyon", label: "Rezervasyon" },
  { id: "musteri", label: "Müşteri" },
  { id: "fiyat", label: "Fiyat" },
  { id: "konfirme", label: "Konfirme" },
  { id: "fatura", label: "Fatura" },
  { id: "odemeler", label: "Ödemeler" },
  { id: "notlar", label: "Notlar" },
] as const;

type BookingDetailTabId = (typeof BOOKING_DETAIL_TABS)[number]["id"];

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={active ? "block space-y-5" : "hidden"} aria-hidden={!active}>
      {children}
    </div>
  );
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function isFeeEmpty(value: number | null | undefined): boolean {
  return value == null || value === 0;
}

function mergePeriodFeesIntoDetails(
  current: BookingDetails,
  periodFees: Record<BookingExtraFeeFieldKey, number | null>
): Partial<BookingDetails> {
  // Talep ekranından gelen kalemler period birim ücretleriyle ezilmesin
  if (
    current.feesFromQuote === true ||
    current.source === "public_pre_reservation"
  ) {
    return {};
  }

  const patch: Partial<BookingDetails> = {};

  for (const { key } of BOOKING_EXTRA_FEE_FIELDS) {
    if (isFeeEmpty(current[key])) {
      const periodValue = periodFees[key];
      if (periodValue != null && periodValue !== 0) {
        patch[key] = periodValue;
      }
    }
  }

  return patch;
}

function GuestTable({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: BookingGuestEntry[];
  onChange: (rows: BookingGuestEntry[]) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="w-12 px-3 py-2">Sıra</th>
            <th className="px-3 py-2">{title}</th>
            <th className="w-40 px-3 py-2">T.C.</th>
            <th className="w-40 px-3 py-2">Plaka</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-gray-100">
              <td className="bg-gray-50 px-3 py-2 text-center text-gray-500">
                {index + 1}
              </td>
              <td className="px-2 py-1.5">
                <input
                  value={row.name}
                  onChange={(event) => {
                    const next = [...rows];
                    next[index] = { ...next[index], name: event.target.value };
                    onChange(next);
                  }}
                  className={bookingInputClass}
                />
              </td>
              <td className="px-2 py-1.5">
                <TcKimlikInput
                  value={row.nationalId}
                  onChange={(nationalId) => {
                    const next = [...rows];
                    next[index] = { ...next[index], nationalId };
                    onChange(next);
                  }}
                  variant="booking"
                  showError={false}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  value={row.plate}
                  onChange={(event) => {
                    const next = [...rows];
                    next[index] = { ...next[index], plate: event.target.value };
                    onChange(next);
                  }}
                  className={bookingInputClass}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BookingDetailModal({
  bookingId,
  onClose,
  onSaved,
}: BookingDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetailRecord | null>(null);
  const [status, setStatus] = useState<BookingStatus>(BookingStatusEnum.NEW);
  const [stayStatus, setStayStatus] = useState<StayStatus>(StayStatus.BEKLENIYOR);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [pets, setPets] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isEntryEditing, setIsEntryEditing] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [details, setDetails] = useState<BookingDetails>({});
  const [periodPrepaymentRate, setPeriodPrepaymentRate] = useState(20);
  const prepaymentManuallyEdited = useRef(false);
  const [activeTab, setActiveTab] = useState<BookingDetailTabId>("rezervasyon");
  const [prepaymentShareOpen, setPrepaymentShareOpen] = useState(false);
  const [optionExpiresAt, setOptionExpiresAt] = useState<Date | null>(null);
  const [confirmationSentAt, setConfirmationSentAt] = useState<Date | null>(null);
  const [prepayments, setPrepayments] = useState<BookingPrepaymentRecord[]>([]);
  const [siteInfoOptions, setSiteInfoOptions] = useState<string[]>([
    DEFAULT_BOOKING_SITE_INFO,
  ]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getSiteInfoOptionsAction()
      .then(setSiteInfoOptions)
      .catch(() => setSiteInfoOptions([DEFAULT_BOOKING_SITE_INFO]));
  }, []);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setActiveTab("rezervasyon");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setLoading(false);
      setError(
        "Rezervasyon yüklenemedi. Sunucu yanıt vermiyor; sayfayı yenileyip tekrar deneyin."
      );
    }, 30000);

    getBookingDetailAction(bookingId)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError("Rezervasyon bulunamadı");
          setBooking(null);
          return;
        }

        setBooking(record);
        setStatus(record.status);
        setStayStatus(record.stayStatus);
        setOptionExpiresAt(record.optionExpiresAt);
        setConfirmationSentAt(record.confirmationSentAt);
        setPrepayments(record.prepayments ?? []);
        setAdults(record.adults);
        setChildren(record.children);
        setBabies(record.babies);
        setPets(record.pets);
        setCheckIn(toDateInputValue(record.checkIn));
        setCheckOut(toDateInputValue(record.checkOut));
        setIsEntryEditing(false);
        setGuestName(record.guestName);
        setGuestEmail(record.guestEmail);
        setGuestPhone(record.guestPhone);
        const parsed = parseBookingDetails(record.details);
        prepaymentManuallyEdited.current = parsed.prepaymentAmount != null;
        setDetails(defaultDetailsFromBooking(record));
        setActiveTab("rezervasyon");
      })
      .catch(() => {
        if (!active) return;
        setError("Rezervasyon yüklenemedi");
      })
      .finally(() => {
        if (!active) return;
        window.clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [bookingId]);

  useEffect(() => {
    if (!booking?.villa.id || !checkIn) return;

    let cancelled = false;
    getBookingPrepaymentRateAction(booking.villa.id, checkIn)
      .then((rate) => {
        if (!cancelled) {
          setPeriodPrepaymentRate(rate);
        }
      })
      .catch(() => {
        if (!cancelled) setPeriodPrepaymentRate(20);
      });

    return () => {
      cancelled = true;
    };
  }, [booking?.villa.id, checkIn]);

  useEffect(() => {
    if (!booking?.villa.id || !checkIn) return;

    let cancelled = false;
    getBookingPeriodFeesAction(booking.villa.id, checkIn)
      .then((periodFees) => {
        if (!cancelled) {
          setDetails((current) => ({
            ...current,
            ...mergePeriodFeesIntoDetails(current, periodFees),
          }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [booking?.villa.id, checkIn]);

  const netPrice = useMemo(() => computeNetPrice(details), [details]);
  const balance = useMemo(
    () => computeBalance(netPrice, details.prepaymentAmount),
    [netPrice, details.prepaymentAmount]
  );
  const checkInPayment = useMemo(
    () => computeCheckInPayment(balance, details),
    [balance, details]
  );

  useEffect(() => {
    const suggested = computePrepaymentAmount(
      details.grossPrice,
      details.ownerDiscountAmount,
      periodPrepaymentRate,
      details.agencyDiscountAmount
    );
    setDetails((current) => {
      if (prepaymentManuallyEdited.current) {
        if (current.prepaymentRate === periodPrepaymentRate) return current;
        return { ...current, prepaymentRate: periodPrepaymentRate };
      }
      return {
        ...current,
        prepaymentRate: periodPrepaymentRate,
        prepaymentAmount: suggested,
      };
    });
  }, [
    periodPrepaymentRate,
    details.grossPrice,
    details.ownerDiscountAmount,
    details.agencyDiscountAmount,
  ]);

  useEffect(() => {
    setDetails((current) => {
      if (current.checkInPayment === checkInPayment) return current;
      return { ...current, checkInPayment };
    });
  }, [checkInPayment]);

  useEffect(() => {
    setDetails((current) => {
      const computed = computeCommissionAmount(netPrice, current.commissionRate);
      if (computed === current.commissionAmount) return current;
      return { ...current, commissionAmount: computed };
    });
  }, [netPrice]);
  const nightCount = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return getNightCount(new Date(`${checkIn}T00:00:00.000Z`), new Date(`${checkOut}T00:00:00.000Z`));
  }, [checkIn, checkOut]);

  const siteOptions = useMemo(() => {
    const current = normalizeBookingSiteInfo(details.siteInfo);
    return dedupeSiteInfoNames([...siteInfoOptions, current]);
  }, [siteInfoOptions, details.siteInfo]);

  const tcFieldsAcceptable = useMemo(() => {
    const guestFields = [
      ...(details.adultGuests ?? []),
      ...(details.childGuests ?? []),
      ...(details.babyGuests ?? []),
    ].map((guest, index) => ({
      value: guest.nationalId,
      label: `Misafir ${index + 1}`,
    }));

    return (
      isTcKimlikAcceptable(details.guestTc ?? "", false) &&
      validateOptionalTcKimlikFields(guestFields) === null
    );
  }, [details]);

  function patchDetails(patch: Partial<BookingDetails>) {
    setDetails((current) => ({ ...current, ...patch }));
  }

  function handleGrossPriceChange(value: number | null) {
    setDetails((current) => {
      const grossPrice = value;
      const ownerDiscountRate = clampDiscountRate(current.ownerDiscountRate);
      const agencyDiscountRate = clampDiscountRate(current.agencyDiscountRate);
      return {
        ...current,
        grossPrice,
        ownerDiscountAmount: computeDiscountAmount(grossPrice, ownerDiscountRate),
        agencyDiscountAmount: computeDiscountAmount(
          grossPrice,
          agencyDiscountRate
        ),
      };
    });
  }

  function handleOwnerDiscountRateChange(rate: number) {
    const ownerDiscountRate = clampDiscountRate(rate);
    const ownerDiscountAmount = computeDiscountAmount(
      details.grossPrice,
      ownerDiscountRate
    );
    patchDetails({
      ownerDiscountRate,
      ownerDiscountAmount,
      discountRate: ownerDiscountRate,
      discountAmount: ownerDiscountAmount,
    });
  }

  function handleAgencyDiscountRateChange(rate: number) {
    const agencyDiscountRate = clampDiscountRate(rate);
    patchDetails({
      agencyDiscountRate,
      agencyDiscountAmount: computeDiscountAmount(
        details.grossPrice,
        agencyDiscountRate
      ),
    });
  }

  function handleCommissionRateChange(rate: number) {
    const commissionRate = clampDiscountRate(rate);
    setDetails((current) => {
      const currentNet = computeNetPrice(current);
      return {
        ...current,
        commissionRate,
        commissionAmount: computeCommissionAmount(currentNet, commissionRate),
      };
    });
  }

  function handleGuestCountsChange(
    nextAdults: number,
    nextChildren: number,
    nextBabies: number,
    nextPets: number
  ) {
    setAdults(nextAdults);
    setChildren(nextChildren);
    setBabies(nextBabies);
    setPets(nextPets);
    setDetails((current) => ({
      ...current,
      adultGuests: buildGuestRows(nextAdults, current.adultGuests),
      childGuests: buildGuestRows(nextChildren, current.childGuests),
      babyGuests: buildGuestRows(nextBabies, current.babyGuests),
    }));
  }

  function handleSave() {
    if (!booking) return;

    if (!tcFieldsAcceptable) {
      setError("Lütfen geçersiz T.C. Kimlik No alanlarını düzeltin.");
      return;
    }

    startTransition(async () => {
      const result = await updateBookingDetailAction({
        id: booking.id,
        status,
        stayStatus,
        checkIn,
        checkOut,
        adults,
        children,
        babies,
        pets,
        guestName,
        guestEmail,
        guestPhone: normalizeTurkishPhoneFieldValue(guestPhone),
        totalPrice: netPrice,
        details: {
          ...details,
          prepaymentRate: periodPrepaymentRate,
          prepaymentAmount: details.prepaymentAmount,
          checkInPayment,
          commissionAmount: details.commissionAmount,
        },
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onSaved();
      onClose();
    });
  }

  if (!bookingId) return null;

  const reservationNo =
    booking?.externalCode != null
      ? String(booking.externalCode)
      : resolveExternalCode(booking?.externalCode, booking?.guestEmail ?? "") ||
        "—";

  const paymentMethod = normalizeCompanyPaymentType(
    details.importPaymentMethod?.trim() ||
      details.prepaymentBank?.trim() ||
      ""
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {reservationNo} Nolu Rezervasyon Düzenleme Formu
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {booking && !loading ? (
          <div className="shrink-0 border-b border-gray-200 bg-white px-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-1 overflow-x-auto pb-px">
                {BOOKING_DETAIL_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "border border-b-0 border-gray-200 bg-white text-violet-700"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rezervasyon Son Durum
                </span>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${BOOKING_STATUS_META[status].className}`}
                >
                  {BOOKING_STATUS_META[status].label}
                </span>
                <OptionCountdown expiresAt={optionExpiresAt} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : error && !booking ? (
            <div className="space-y-3 py-10 text-center">
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Sayfayı Yenile
              </button>
            </div>
          ) : booking ? (
            <>
              <TabPanel active={activeTab === "rezervasyon"}>
              <FormSection title="Tatil Bilgileri">
                <FormRow label="Rezervasyon No">
                  <ReadonlyField value={reservationNo} />
                </FormRow>
                <FormRow label="Rezervasyon Tarihi">
                  <ReadonlyField value={formatBookingDate(booking.createdAt)} />
                </FormRow>
                <FormRow label="Site Bilgisi">
                  <select
                    value={normalizeBookingSiteInfo(details.siteInfo)}
                    onChange={(event) =>
                      patchDetails({
                        siteInfo: normalizeBookingSiteInfo(event.target.value),
                      })
                    }
                    className={bookingInputClass}
                  >
                    {siteOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="Konaklama Durumu">
                  <select
                    value={stayStatus}
                    onChange={(event) =>
                      setStayStatus(event.target.value as StayStatus)
                    }
                    className={bookingInputClass}
                  >
                    {STAY_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormRow>
              </FormSection>

              <FormSection title="Giriş Bilgileri">
                <FormRow label="Tesis Adı">
                  <ReadonlyField value={booking.villa.name} />
                </FormRow>
                <FormRow label="Konaklama Giriş Tarihi">
                  {isEntryEditing ? (
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(event) => setCheckIn(event.target.value)}
                      className={bookingInputClass}
                    />
                  ) : (
                    <ReadonlyField
                      value={formatBookingDate(new Date(`${checkIn}T00:00:00.000Z`))}
                    />
                  )}
                </FormRow>
                <FormRow label="Konaklama Çıkış Tarihi">
                  {isEntryEditing ? (
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(event) => setCheckOut(event.target.value)}
                      className={bookingInputClass}
                    />
                  ) : (
                    <ReadonlyField
                      value={formatBookingDate(new Date(`${checkOut}T00:00:00.000Z`))}
                    />
                  )}
                </FormRow>
                <FormRow label="Gece Sayısı">
                  <ReadonlyField value={String(nightCount)} />
                </FormRow>
                <FormRow label="Kişi Sayısı">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2" title="Yetişkin">
                      <Users className="h-4 w-4 text-gray-500" />
                      <select
                        value={adults}
                        disabled={!isEntryEditing}
                        onChange={(event) =>
                          handleGuestCountsChange(
                            Number(event.target.value),
                            children,
                            babies,
                            pets
                          )
                        }
                        className="w-20 rounded-md border border-gray-200 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        {Array.from({ length: 20 }, (_, index) => index + 1).map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label className="flex items-center gap-2" title="Çocuk">
                      <User className="h-4 w-4 text-gray-500" />
                      <select
                        value={children}
                        disabled={!isEntryEditing}
                        onChange={(event) =>
                          handleGuestCountsChange(
                            adults,
                            Number(event.target.value),
                            babies,
                            pets
                          )
                        }
                        className="w-20 rounded-md border border-gray-200 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        {Array.from({ length: 11 }, (_, index) => index).map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label className="flex items-center gap-2" title="Bebek">
                      <Baby className="h-4 w-4 text-gray-500" />
                      <select
                        value={babies}
                        disabled={!isEntryEditing}
                        onChange={(event) =>
                          handleGuestCountsChange(
                            adults,
                            children,
                            Number(event.target.value),
                            pets
                          )
                        }
                        className="w-20 rounded-md border border-gray-200 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        {Array.from({ length: 6 }, (_, index) => index).map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label className="flex items-center gap-2" title="Evcil hayvan">
                      <PawPrint className="h-4 w-4 text-gray-500" />
                      <select
                        value={pets}
                        disabled={!isEntryEditing}
                        onChange={(event) =>
                          handleGuestCountsChange(
                            adults,
                            children,
                            babies,
                            Number(event.target.value)
                          )
                        }
                        className="w-20 rounded-md border border-gray-200 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        {Array.from({ length: 4 }, (_, index) => index).map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>
                </FormRow>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEntryEditing(true)}
                    disabled={isEntryEditing}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-violet-700 hover:bg-violet-100 disabled:cursor-default disabled:opacity-60"
                  >
                    Değişiklik Yap
                  </button>
                </div>
              </FormSection>
              </TabPanel>

              <TabPanel active={activeTab === "fiyat"}>
              <FormSection title="Fiyat Bilgileri">
                <FormRow label="Konaklama Bedeli Komisyonlu">
                  <input
                    value={details.grossPrice ?? ""}
                    onChange={(event) =>
                      handleGrossPriceChange(parseNumber(event.target.value))
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Villa Sahibi İndirimi (% - Tutar)">
                  <DiscountPercentAmountField
                    rate={details.ownerDiscountRate ?? 0}
                    amount={details.ownerDiscountAmount ?? 0}
                    onRateChange={handleOwnerDiscountRateChange}
                    onAmountChange={(amount) =>
                      patchDetails({
                        ownerDiscountAmount: amount ?? 0,
                        discountAmount: amount ?? 0,
                      })
                    }
                  />
                </FormRow>
                <FormRow label="Acente İndirimi (% - Tutar)">
                  <DiscountPercentAmountField
                    rate={details.agencyDiscountRate ?? 0}
                    amount={details.agencyDiscountAmount ?? 0}
                    onRateChange={handleAgencyDiscountRateChange}
                    onAmountChange={(amount) =>
                      patchDetails({ agencyDiscountAmount: amount ?? 0 })
                    }
                  />
                </FormRow>
                <FormRow label="Acente Hizmet Bedeli">
                  <input
                    value={details.agencyServiceFee ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        agencyServiceFee: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Konaklama Tutarı Komisyonsuz">
                  <ReadonlyField value={netPrice != null ? String(netPrice) : ""} />
                </FormRow>
                <FormRow label="Ön Ödeme Tutarı">
                  <div className="flex gap-2">
                    <input
                      value={
                        details.prepaymentAmount != null
                          ? String(details.prepaymentAmount)
                          : ""
                      }
                      onChange={(event) => {
                        prepaymentManuallyEdited.current = true;
                        patchDetails({
                          prepaymentAmount: parseNumber(event.target.value),
                        });
                      }}
                      className={bookingInputClass}
                    />
                    <div className="flex w-24 shrink-0 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-600">
                      %{periodPrepaymentRate}
                    </div>
                  </div>
                </FormRow>
                <FormRow label="Ödeme Türü">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <select
                        value={normalizeCompanyPaymentType(
                          details.importPaymentMethod ?? ""
                        )}
                        onChange={(event) =>
                          patchDetails({
                            importPaymentMethod: event.target.value,
                            prepaymentBank: event.target.value,
                          })
                        }
                        className={bookingInputClass}
                      >
                        <option value="">Seçiniz</option>
                        {getSortedCompanyPaymentTypeOptions().map(
                          (option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrepaymentShareOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Ön Ödeme Bilgisi Paylaş
                    </button>
                  </div>
                </FormRow>
                <FormRow label="Konaklama Bakiyesi">
                  <ReadonlyField value={balance != null ? String(balance) : ""} />
                </FormRow>
                {BOOKING_EXTRA_FEE_FIELDS.map(({ key, label }) => (
                  <FormRow key={key} label={label}>
                    <input
                      value={formatFeeInputValue(details[key])}
                      onChange={(event) =>
                        patchDetails({
                          [key]: parseNumber(event.target.value),
                        })
                      }
                      className={bookingInputClass}
                    />
                  </FormRow>
                ))}
                <FormRow label="Girişte Alınacak Ödeme">
                  <ReadonlyField
                    value={checkInPayment != null ? String(checkInPayment) : ""}
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Villa ve Komisyon Bilgileri">
                <FormRow label="Satış Türü">
                  <ReadonlyField value={booking.villa.salesType} />
                </FormRow>
                <FormRow label="Komisyon Oranı (% - Tutar)">
                  <DiscountPercentAmountField
                    rate={details.commissionRate ?? 0}
                    amount={details.commissionAmount ?? 0}
                    onRateChange={handleCommissionRateChange}
                    onAmountChange={(amount) =>
                      patchDetails({ commissionAmount: amount ?? 0 })
                    }
                  />
                </FormRow>
              </FormSection>
              </TabPanel>

              <TabPanel active={activeTab === "konfirme"}>
                <BookingKonfirmeTab
                  bookingId={booking.id}
                  expectedPrepaymentAmount={details.prepaymentAmount ?? null}
                  prepayments={prepayments}
                  confirmationSentAt={confirmationSentAt}
                  onPrepaymentSaved={(prepayment) => {
                    setPrepayments((current) => [...current, prepayment]);
                    setOptionExpiresAt(null);
                  }}
                  onConfirmationSent={() => {
                    setStatus(BookingStatusEnum.CONFIRMATION_SENT);
                    setConfirmationSentAt(new Date());
                  }}
                />
              </TabPanel>

              <TabPanel active={activeTab === "musteri"}>
              <FormSection title="Müşteri Bilgileri">
                <FormRow label="Müşteri Adı Soyadı">
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Müşteri T.C.">
                  <TcKimlikInput
                    value={details.guestTc ?? ""}
                    onChange={(guestTc) => patchDetails({ guestTc })}
                    variant="booking"
                  />
                </FormRow>
                <FormRow label="Müşteri Telefon">
                  <TurkishPhoneField
                    value={guestPhone}
                    onChange={setGuestPhone}
                    focusPalette="indigo"
                    hideLabel
                    compact
                  />
                </FormRow>
                <FormRow label="Müşteri Mail">
                  <input
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    className={bookingInputClass}
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Müşteri Adresi">
                <FormRow label="Adres">
                  <textarea
                    value={details.guestAddress ?? ""}
                    onChange={(event) =>
                      patchDetails({ guestAddress: event.target.value })
                    }
                    rows={3}
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="İlçe">
                  <input
                    value={details.guestDistrict ?? ""}
                    onChange={(event) =>
                      patchDetails({ guestDistrict: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="İl">
                  <input
                    value={details.guestCity ?? ""}
                    onChange={(event) =>
                      patchDetails({ guestCity: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Ülke">
                  <input
                    value={details.guestCountry ?? "Türkiye"}
                    onChange={(event) =>
                      patchDetails({ guestCountry: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Misafir Bilgileri">
                <GuestTable
                  title="Yetişkin Misafir(ler)"
                  rows={details.adultGuests ?? []}
                  onChange={(rows) => patchDetails({ adultGuests: rows })}
                />
                <GuestTable
                  title="Çocuk Misafir(ler)"
                  rows={details.childGuests ?? []}
                  onChange={(rows) => patchDetails({ childGuests: rows })}
                />
                <GuestTable
                  title="Bebek Misafir(ler)"
                  rows={details.babyGuests ?? []}
                  onChange={(rows) => patchDetails({ babyGuests: rows })}
                />
              </FormSection>
              </TabPanel>

              <TabPanel active={activeTab === "fatura"}>
              <FormSection title="Mükellefiyet Bilgileri">
                <FormRow label="Bilgi Girmek İstiyorum">
                  <select
                    value={details.wantsTaxpayerInfo ?? "hayir"}
                    onChange={(event) =>
                      patchDetails({ wantsTaxpayerInfo: event.target.value })
                    }
                    className={bookingInputClass}
                  >
                    {YES_NO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="Mükellefiyet Türü">
                  <select
                    value={details.taxpayerType ?? "sahis"}
                    onChange={(event) =>
                      patchDetails({ taxpayerType: event.target.value })
                    }
                    className={bookingInputClass}
                  >
                    {TAXPAYER_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="E Fatura Kullanıcısı">
                  <select
                    value={details.eInvoiceUser ?? "hayir"}
                    onChange={(event) =>
                      patchDetails({ eInvoiceUser: event.target.value })
                    }
                    className={bookingInputClass}
                  >
                    {YES_NO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="Adı Soyadı / Ünvanı">
                  <input
                    value={details.invoiceTitle ?? guestName}
                    onChange={(event) =>
                      patchDetails({ invoiceTitle: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Fatura Adres Bilgileri">
                <FormRow label="Fatura Ülke">
                  <input
                    value={details.invoiceCountry ?? "Türkiye"}
                    onChange={(event) =>
                      patchDetails({ invoiceCountry: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Fatura İl">
                  <input
                    value={details.invoiceCity ?? ""}
                    onChange={(event) =>
                      patchDetails({ invoiceCity: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Fatura İlçe">
                  <input
                    value={details.invoiceDistrict ?? ""}
                    onChange={(event) =>
                      patchDetails({ invoiceDistrict: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Fatura Adres">
                  <textarea
                    value={details.invoiceAddress ?? ""}
                    onChange={(event) =>
                      patchDetails({ invoiceAddress: event.target.value })
                    }
                    rows={2}
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Fatura Vergi Dairesi">
                  <input
                    value={details.invoiceTaxOffice ?? ""}
                    onChange={(event) =>
                      patchDetails({ invoiceTaxOffice: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Fatura Vergi Numarası">
                  <input
                    value={details.invoiceTaxNumber ?? ""}
                    onChange={(event) =>
                      patchDetails({ invoiceTaxNumber: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Fatura Bilgileri">
                <FormRow label="Fatura Tarihi">
                  <input
                    type="date"
                    value={details.invoiceDate ?? ""}
                    onChange={(event) =>
                      patchDetails({ invoiceDate: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Fatura No">
                  <input
                    value={details.invoiceNo ?? ""}
                    onChange={(event) =>
                      patchDetails({ invoiceNo: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Kesilecek Fatura Tutarı">
                  <input
                    value={details.invoiceAmount ?? ""}
                    onChange={(event) =>
                      patchDetails({
                        invoiceAmount: parseNumber(event.target.value),
                      })
                    }
                    className={bookingReadonlyClass}
                  />
                </FormRow>
                <FormRow label="Düzenlenen Fatura Tutarı">
                  <input
                    value={details.issuedInvoiceAmount ?? ""}
                    onChange={(event) =>
                      patchDetails({
                        issuedInvoiceAmount: parseNumber(event.target.value),
                      })
                    }
                    className={bookingReadonlyClass}
                  />
                </FormRow>
              </FormSection>
              </TabPanel>

              <TabPanel active={activeTab === "odemeler"}>
              <FormSection title="Acente Bilgileri">
                <FormRow label="Acente Adı">
                  <input
                    value={details.agencyName ?? ""}
                    onChange={(event) =>
                      patchDetails({ agencyName: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Acente Komisyon Oranı">
                  <input
                    value={details.agencyCommissionRate ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        agencyCommissionRate: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Acente Komisyon Hakediş Bedeli">
                  <ReadonlyField
                    value={String(details.agencyCommissionEarned ?? 0)}
                  />
                </FormRow>
                <FormRow label="Acenteden Gelecek Para">
                  <ReadonlyField
                    value={String(details.agencyExpectedAmount ?? 0)}
                  />
                </FormRow>
                <FormRow label="Acenteden Gelen Para Tarihi">
                  <input
                    type="date"
                    value={details.agencyReceivedDate ?? ""}
                    onChange={(event) =>
                      patchDetails({ agencyReceivedDate: event.target.value })
                    }
                    className={bookingReadonlyClass}
                  />
                </FormRow>
                <FormRow label="Acenteden Gelen Para Tutarı">
                  <ReadonlyField
                    value={String(details.agencyReceivedAmount ?? 0)}
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Villa Sahibi Bilgileri">
                <FormRow label="Villa Ödeme Vadesi">
                  <input
                    value={details.ownerPaymentTerm ?? ""}
                    onChange={(event) =>
                      patchDetails({ ownerPaymentTerm: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Villa Sahibi Adı">
                  <ReadonlyField value={booking.villa.owner?.name ?? ""} />
                </FormRow>
                <FormRow label="Villa Sahibi Muhasebe Kodu">
                  <ReadonlyField
                    value={booking.villa.owner?.accountingCode ?? ""}
                  />
                </FormRow>
                <FormRow label="Villa Sahibine Ödenecek Para">
                  <input
                    value={details.ownerPayableAmount ?? ""}
                    onChange={(event) =>
                      patchDetails({
                        ownerPayableAmount: parseNumber(event.target.value),
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Villa Sahibinin Müşteriden Alacağı Para">
                  <input
                    value={details.ownerCollectFromGuest ?? ""}
                    onChange={(event) =>
                      patchDetails({
                        ownerCollectFromGuest: parseNumber(event.target.value),
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Villa Sahibine Ödeme Yapılacak Tarih">
                  <input
                    type="date"
                    value={details.ownerPaymentDueDate ?? ""}
                    onChange={(event) =>
                      patchDetails({ ownerPaymentDueDate: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Villa Sahibine Ödeme Yapılan Tarih">
                  <input
                    type="date"
                    value={details.ownerPaymentDate ?? ""}
                    onChange={(event) =>
                      patchDetails({ ownerPaymentDate: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Villa Sahibine Ödenen Para">
                  <input
                    value={details.ownerPaidAmount ?? ""}
                    onChange={(event) =>
                      patchDetails({
                        ownerPaidAmount: parseNumber(event.target.value),
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Satış Temsilcisi Bilgileri">
                <FormRow label="Satış Temsilcisi Adı">
                  <input
                    value={details.salesRepName ?? ""}
                    onChange={(event) =>
                      patchDetails({ salesRepName: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Satış Temsilcisi Prim Oranı">
                  <input
                    value={details.salesRepCommissionRate ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        salesRepCommissionRate: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Satış Temsilcisi Prim Hakedişi">
                  <ReadonlyField
                    value={String(details.salesRepCommissionEarned ?? 0)}
                  />
                </FormRow>
              </FormSection>
              </TabPanel>

              <TabPanel active={activeTab === "notlar"}>
              <FormSection title="Not Bilgileri">
                <FormRow label="Acente Notu">
                  <textarea
                    value={details.agencyNote ?? ""}
                    onChange={(event) =>
                      patchDetails({ agencyNote: event.target.value })
                    }
                    rows={2}
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Müşteri Notu">
                  <textarea
                    value={details.customerNote ?? ""}
                    onChange={(event) =>
                      patchDetails({ customerNote: event.target.value })
                    }
                    rows={3}
                    className={bookingInputClass}
                  />
                </FormRow>
              </FormSection>
              </TabPanel>

              {error ? (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || loading || !booking || !tcFieldsAcceptable}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {booking ? (
        <PrepaymentShareModal
          open={prepaymentShareOpen}
          onClose={() => setPrepaymentShareOpen(false)}
          onSuccess={({ optionExpiresAt: expiresAt }) => {
            setStatus(BookingStatusEnum.PREPAYMENT);
            setOptionExpiresAt(expiresAt);
          }}
          bookingId={booking.id}
          prepaymentAmount={details.prepaymentAmount ?? null}
          paymentMethod={paymentMethod}
        />
      ) : null}
    </div>
  );
}
