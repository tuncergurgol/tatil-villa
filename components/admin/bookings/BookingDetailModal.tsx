"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Baby, Loader2, User, Users, X } from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { BookingStatus as BookingStatusEnum } from "@prisma/client";
import { StayStatus, STAY_STATUS_OPTIONS } from "@/lib/stay-status";
import {
  getBookingDetailAction,
  updateBookingDetailAction,
} from "@/app/actions/admin/bookings";
import { BOOKING_STATUS_OPTIONS } from "@/lib/booking-status";
import {
  type BookingDetailRecord,
  type BookingDetails,
  type BookingGuestEntry,
  TAXPAYER_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  buildGuestRows,
  computeBalance,
  computeCommissionAmount,
  computeNetPrice,
  defaultDetailsFromBooking,
  formatBookingDate,
  getNightCount,
  resolveExternalCode,
} from "@/lib/booking-form-details";
import {
  FormRow,
  FormSection,
  ReadonlyField,
  bookingInputClass,
  bookingReadonlyClass,
} from "@/components/admin/bookings/booking-form-ui";

interface BookingDetailModalProps {
  bookingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const BOOKING_DETAIL_TABS = [
  { id: "rezervasyon", label: "Rezervasyon" },
  { id: "fiyat", label: "Fiyat" },
  { id: "musteri", label: "Müşteri" },
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
                <input
                  value={row.nationalId}
                  onChange={(event) => {
                    const next = [...rows];
                    next[index] = {
                      ...next[index],
                      nationalId: event.target.value,
                    };
                    onChange(next);
                  }}
                  className={bookingInputClass}
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
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [details, setDetails] = useState<BookingDetails>({});
  const [activeTab, setActiveTab] = useState<BookingDetailTabId>("rezervasyon");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setActiveTab("rezervasyon");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getBookingDetailAction(bookingId)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          setError("Rezervasyon bulunamadı");
          setBooking(null);
          return;
        }

        setBooking(record);
        setStatus(record.status);
        setStayStatus(record.stayStatus);
        setAdults(record.adults);
        setChildren(record.children);
        setBabies(record.babies);
        setGuestName(record.guestName);
        setGuestEmail(record.guestEmail);
        setGuestPhone(record.guestPhone);
        setDetails(defaultDetailsFromBooking(record));
        setActiveTab("rezervasyon");
      })
      .catch(() => {
        if (!cancelled) setError("Rezervasyon yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const netPrice = useMemo(() => computeNetPrice(details), [details]);
  const balance = useMemo(
    () => computeBalance(netPrice, details.prepaymentAmount),
    [netPrice, details.prepaymentAmount]
  );
  const commissionAmount = useMemo(
    () => computeCommissionAmount(netPrice, details.commissionRate),
    [netPrice, details.commissionRate]
  );

  function patchDetails(patch: Partial<BookingDetails>) {
    setDetails((current) => ({ ...current, ...patch }));
  }

  function handleGuestCountsChange(
    nextAdults: number,
    nextChildren: number,
    nextBabies: number
  ) {
    setAdults(nextAdults);
    setChildren(nextChildren);
    setBabies(nextBabies);
    setDetails((current) => ({
      ...current,
      adultGuests: buildGuestRows(nextAdults, current.adultGuests),
      childGuests: buildGuestRows(nextChildren, current.childGuests),
      babyGuests: buildGuestRows(nextBabies, current.babyGuests),
    }));
  }

  function handleSave() {
    if (!booking) return;

    startTransition(async () => {
      const result = await updateBookingDetailAction({
        id: booking.id,
        status,
        stayStatus,
        adults,
        children,
        babies,
        guestName,
        guestEmail,
        guestPhone,
        totalPrice: netPrice,
        details: {
          ...details,
          commissionAmount,
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

  const reservationCode =
    resolveExternalCode(booking?.externalCode, booking?.guestEmail ?? "") ||
    booking?.id.slice(-5).toUpperCase() ||
    "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3">
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {reservationCode} Nolu Rezervasyon Düzenleme Formu
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : error && !booking ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : booking ? (
            <div>
              <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
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

              <TabPanel active={activeTab === "rezervasyon"}>
              <FormSection title="Tatil Bilgileri">
                <FormRow label="Rezervasyon Kodu">
                  <ReadonlyField value={reservationCode} />
                </FormRow>
                <FormRow label="Rezervasyon Tarihi">
                  <ReadonlyField value={formatBookingDate(booking.createdAt)} />
                </FormRow>
                <FormRow label="Rezervasyon Son Durum">
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as BookingStatus)
                    }
                    className={bookingInputClass}
                  >
                    {BOOKING_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
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
                  <ReadonlyField value={formatBookingDate(booking.checkIn)} />
                </FormRow>
                <FormRow label="Konaklama Çıkış Tarihi">
                  <ReadonlyField value={formatBookingDate(booking.checkOut)} />
                </FormRow>
                <FormRow label="Gece Sayısı">
                  <ReadonlyField
                    value={String(getNightCount(booking.checkIn, booking.checkOut))}
                  />
                </FormRow>
                <FormRow label="Kişi Sayısı">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <select
                        value={adults}
                        onChange={(event) =>
                          handleGuestCountsChange(
                            Number(event.target.value),
                            children,
                            babies
                          )
                        }
                        className="w-20 rounded-md border border-gray-200 px-2 py-2 text-sm"
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
                    <label className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <select
                        value={children}
                        onChange={(event) =>
                          handleGuestCountsChange(
                            adults,
                            Number(event.target.value),
                            babies
                          )
                        }
                        className="w-20 rounded-md border border-gray-200 px-2 py-2 text-sm"
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
                    <label className="flex items-center gap-2">
                      <Baby className="h-4 w-4 text-gray-500" />
                      <select
                        value={babies}
                        onChange={(event) =>
                          handleGuestCountsChange(
                            adults,
                            children,
                            Number(event.target.value)
                          )
                        }
                        className="w-20 rounded-md border border-gray-200 px-2 py-2 text-sm"
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
                  </div>
                </FormRow>
              </FormSection>
              </TabPanel>

              <TabPanel active={activeTab === "fiyat"}>
              <FormSection title="Fiyat Bilgileri">
                <FormRow label="Konaklama Bedeli (Brüt)">
                  <input
                    value={details.grossPrice ?? ""}
                    onChange={(event) =>
                      patchDetails({ grossPrice: parseNumber(event.target.value) })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="İndirim Oranı (%)">
                  <input
                    value={details.discountRate ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        discountRate: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="İndirim Tutarı">
                  <input
                    value={details.discountAmount ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        discountAmount: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
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
                <FormRow label="Konaklama Bedeli (Net)">
                  <ReadonlyField value={netPrice != null ? String(netPrice) : ""} />
                </FormRow>
                <FormRow label="Ön Ödeme Tutarı">
                  <div className="flex gap-2">
                    <input
                      value={details.prepaymentAmount ?? ""}
                      onChange={(event) =>
                        patchDetails({
                          prepaymentAmount: parseNumber(event.target.value),
                        })
                      }
                      className={bookingInputClass}
                    />
                    <div className="flex w-24 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-600">
                      %{details.prepaymentRate ?? 20}
                    </div>
                  </div>
                </FormRow>
                <FormRow label="Ön Ödeme Kasa / Banka Adı">
                  <input
                    value={details.prepaymentBank ?? ""}
                    onChange={(event) =>
                      patchDetails({ prepaymentBank: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Konaklama Bakiyesi">
                  <ReadonlyField value={balance != null ? String(balance) : ""} />
                </FormRow>
                <FormRow label="Temizlik Bedeli">
                  <input
                    value={details.cleaningFee ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        cleaningFee: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Isıtma Bedeli">
                  <input
                    value={details.heatingFee ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        heatingFee: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Hasar Depozitosu">
                  <input
                    value={details.damageDeposit ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        damageDeposit: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Ek Hizmet Bedeli">
                  <input
                    value={details.extraServiceFee ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        extraServiceFee: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Girişte Alınacak Ödeme">
                  <input
                    value={details.checkInPayment ?? ""}
                    onChange={(event) =>
                      patchDetails({
                        checkInPayment: parseNumber(event.target.value),
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
              </FormSection>

              <FormSection title="Villa ve Komisyon Bilgileri">
                <FormRow label="Villa ID">
                  <ReadonlyField
                    value={booking.villa.villaId ? String(booking.villa.villaId) : ""}
                  />
                </FormRow>
                <FormRow label="Satış Türü">
                  <ReadonlyField value={booking.villa.salesType} />
                </FormRow>
                <FormRow label="KBS Bildirilecek">
                  <ReadonlyField
                    value={booking.villa.kbsReportable ? "Evet" : "Hayır"}
                  />
                </FormRow>
                <FormRow label="Komisyon Oranı">
                  <input
                    value={details.commissionRate ?? 0}
                    onChange={(event) =>
                      patchDetails({
                        commissionRate: parseNumber(event.target.value) ?? 0,
                      })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Komisyon Tutarı">
                  <ReadonlyField
                    value={commissionAmount != null ? String(commissionAmount) : ""}
                  />
                </FormRow>
              </FormSection>
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
                  <input
                    value={details.guestTc ?? ""}
                    onChange={(event) =>
                      patchDetails({ guestTc: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Müşteri Muhasebe Kodu">
                  <input
                    value={details.guestAccountingCode ?? ""}
                    onChange={(event) =>
                      patchDetails({ guestAccountingCode: event.target.value })
                    }
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Müşteri Telefon">
                  <input
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Müşteri Mail">
                  <input
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    className={bookingInputClass}
                  />
                </FormRow>
                <FormRow label="Müşteri Adres">
                  <textarea
                    value={details.guestAddress ?? ""}
                    onChange={(event) =>
                      patchDetails({ guestAddress: event.target.value })
                    }
                    rows={3}
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
            </div>
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
            disabled={isPending || loading || !booking}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
