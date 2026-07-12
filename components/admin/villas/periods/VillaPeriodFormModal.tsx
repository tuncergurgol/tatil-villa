"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  Save,
  UserPlus,
  X,
} from "lucide-react";
import {
  createVillaPricePeriod,
  updateVillaPricePeriodDaysDiscounts,
  updateVillaPricePeriodDaysPricing,
  updateVillaPeriodDaysOccupancy,
} from "@/app/actions/admin/villa-periods";
import VillaPeriodRangePreview from "@/components/admin/villas/periods/VillaPeriodRangePreview";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import { toDateKey } from "@/lib/villa-period-calendar";
import {
  VILLA_PERIOD_CURRENCIES,
  calculateCommissionAmount,
  calculateDiscountAmounts,
  formatAmountInput,
  formatMoneyAmount,
  parseAmountInput,
  sanitizeAmountInput,
  syncPeriodPrices,
  type VillaPeriodAvailability,
  type VillaPeriodCurrency,
} from "@/lib/villa-period-pricing";

export type VillaPeriodFormDateRange = {
  startDate: string;
  endDate: string;
};

interface VillaPeriodFormModalProps {
  open: boolean;
  villaId: string;
  period?: VillaPricePeriodItem | null;
  prefillDateRange?: VillaPeriodFormDateRange | null;
  continueAfterSave: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const noSpinClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const labelClass = "text-xs font-medium text-gray-500";
const helpClass = "mt-1.5 text-xs text-gray-500";

const AMOUNT_FIELDS = new Set([
  "nightlyPrice",
  "weeklyPrice",
  "nightlyPriceWithoutCommission",
  "cleaningFee",
  "damageDeposit",
  "petCleaningFee",
  "petDamageDeposit",
  "underfloorHeatingFee",
  "extraBedFee",
  "poolHeatingPrivateFee",
  "poolHeatingIndoorFee",
  "poolHeatingKidsFee",
  "extraDiscountAmount",
  "weekendPrice",
  "childFee02",
  "childFee03_09",
]);

const DISCOUNT_FIELDS = new Set([
  "discount1Rate",
  "discount2Rate",
  "extraDiscountAmount",
]);

const FORM_META_FIELDS = new Set([
  "occupancySelection",
  "actionStartDate",
  "actionEndDate",
]);

type PeriodFormState = {
  actionStartDate: string;
  actionEndDate: string;
  availability: VillaPeriodAvailability;
  occupancySelection: "" | "EMPTY" | "BOOKED";
  nightlyPrice: string;
  nightlyPriceCurrency: VillaPeriodCurrency;
  weeklyPrice: string;
  prepaymentRate: string;
  commissionRate: string;
  nightlyPriceWithoutCommission: string;
  minStayNights: string;
  cleaningDayCount: string;
  cleaningFee: string;
  cleaningFeeCurrency: VillaPeriodCurrency;
  damageDeposit: string;
  damageDepositCurrency: VillaPeriodCurrency;
  petCleaningFee: string;
  petCleaningFeeCurrency: VillaPeriodCurrency;
  petDamageDeposit: string;
  petDamageDepositCurrency: VillaPeriodCurrency;
  underfloorHeatingFee: string;
  underfloorHeatingFeeCurrency: VillaPeriodCurrency;
  extraBedFee: string;
  extraBedFeeCurrency: VillaPeriodCurrency;
  poolHeatingPrivateFee: string;
  poolHeatingPrivateFeeCurrency: VillaPeriodCurrency;
  poolHeatingIndoorFee: string;
  poolHeatingIndoorFeeCurrency: VillaPeriodCurrency;
  poolHeatingKidsFee: string;
  poolHeatingKidsFeeCurrency: VillaPeriodCurrency;
  discount1Rate: string;
  discount2Rate: string;
  extraDiscountAmount: string;
  weekendPrice: string;
  weekendDays: string;
  weekendMinStayNights: string;
  childFee02: string;
  childFee02Currency: VillaPeriodCurrency;
  childFee03_09: string;
  childFee03_09Currency: VillaPeriodCurrency;
};

const emptyFormState = (): PeriodFormState => ({
  actionStartDate: "",
  actionEndDate: "",
  availability: "available",
  occupancySelection: "",
  nightlyPrice: "",
  nightlyPriceCurrency: "TL",
  weeklyPrice: "",
  prepaymentRate: "",
  commissionRate: "",
  nightlyPriceWithoutCommission: "",
  minStayNights: "",
  cleaningDayCount: "",
  cleaningFee: "",
  cleaningFeeCurrency: "TL",
  damageDeposit: "",
  damageDepositCurrency: "TL",
  petCleaningFee: "",
  petCleaningFeeCurrency: "TL",
  petDamageDeposit: "",
  petDamageDepositCurrency: "TL",
  underfloorHeatingFee: "",
  underfloorHeatingFeeCurrency: "TL",
  extraBedFee: "",
  extraBedFeeCurrency: "TL",
  poolHeatingPrivateFee: "",
  poolHeatingPrivateFeeCurrency: "TL",
  poolHeatingIndoorFee: "",
  poolHeatingIndoorFeeCurrency: "TL",
  poolHeatingKidsFee: "",
  poolHeatingKidsFeeCurrency: "TL",
  discount1Rate: "",
  discount2Rate: "",
  extraDiscountAmount: "",
  weekendPrice: "",
  weekendDays: "",
  weekendMinStayNights: "",
  childFee02: "",
  childFee02Currency: "TL",
  childFee03_09: "",
  childFee03_09Currency: "TL",
});

function toInputValue(value: number | null | undefined) {
  return formatAmountInput(value);
}

function periodToFormState(period: VillaPricePeriodItem): PeriodFormState {
  const startDate = toDateKey(period.startDate);
  const endDate = toDateKey(period.endDate);

  return {
    actionStartDate: startDate,
    actionEndDate: endDate,
    availability: "available",
    occupancySelection: "",
    nightlyPrice: formatAmountInput(period.nightlyPrice),
    nightlyPriceCurrency: period.nightlyPriceCurrency,
    weeklyPrice: toInputValue(period.weeklyPrice),
    prepaymentRate: toInputValue(period.prepaymentRate),
    commissionRate: toInputValue(period.commissionRate),
    nightlyPriceWithoutCommission: toInputValue(
      period.nightlyPriceWithoutCommission
    ),
    minStayNights: toInputValue(period.minStayNights),
    cleaningDayCount: toInputValue(period.cleaningDayCount),
    cleaningFee: toInputValue(period.cleaningFee),
    cleaningFeeCurrency: period.cleaningFeeCurrency,
    damageDeposit: toInputValue(period.damageDeposit),
    damageDepositCurrency: period.damageDepositCurrency,
    petCleaningFee: toInputValue(period.petCleaningFee),
    petCleaningFeeCurrency: period.petCleaningFeeCurrency,
    petDamageDeposit: toInputValue(period.petDamageDeposit),
    petDamageDepositCurrency: period.petDamageDepositCurrency,
    underfloorHeatingFee: toInputValue(period.underfloorHeatingFee),
    underfloorHeatingFeeCurrency: period.underfloorHeatingFeeCurrency,
    extraBedFee: toInputValue(period.extraBedFee),
    extraBedFeeCurrency: period.extraBedFeeCurrency,
    poolHeatingPrivateFee: toInputValue(period.poolHeatingPrivateFee),
    poolHeatingPrivateFeeCurrency: period.poolHeatingPrivateFeeCurrency,
    poolHeatingIndoorFee: toInputValue(period.poolHeatingIndoorFee),
    poolHeatingIndoorFeeCurrency: period.poolHeatingIndoorFeeCurrency,
    poolHeatingKidsFee: toInputValue(period.poolHeatingKidsFee),
    poolHeatingKidsFeeCurrency: period.poolHeatingKidsFeeCurrency,
    discount1Rate: toInputValue(period.discount1Rate),
    discount2Rate: toInputValue(period.discount2Rate),
    extraDiscountAmount: toInputValue(period.extraDiscountAmount),
    weekendPrice: toInputValue(period.weekendPrice),
    weekendDays: period.weekendDays.join(","),
    weekendMinStayNights: toInputValue(period.weekendMinStayNights),
    childFee02: toInputValue(period.childFee02),
    childFee02Currency: period.childFee02Currency,
    childFee03_09: toInputValue(period.childFee03_09),
    childFee03_09Currency: period.childFee03_09Currency,
  };
}

function parseNumber(value: string) {
  return parseAmountInput(value);
}

function parseRate(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(100, Math.round(parsed));
}

function AmountInput({
  value,
  onChange,
  required = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      required={required}
      value={value}
      onChange={(event) => onChange(sanitizeAmountInput(event.target.value))}
      className={`${inputClass} ${className}`}
    />
  );
}

function SectionHeader({
  title,
  icon,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "blue" | "gray" | "teal";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-sky-50 text-sky-900"
      : tone === "teal"
        ? "bg-teal-50 text-teal-900"
        : "bg-gray-100 text-gray-900";

  return (
    <div
      className={`flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold ${toneClass}`}
    >
      {icon}
      {title}
    </div>
  );
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: VillaPeriodCurrency;
  onChange: (value: VillaPeriodCurrency) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value as VillaPeriodCurrency)
      }
      className="w-20 rounded-xl border border-gray-200 bg-gray-50/80 px-2 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100"
    >
      {VILLA_PERIOD_CURRENCIES.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  );
}

function FeeRow({
  label,
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
}: {
  label: string;
  amount: string;
  currency: VillaPeriodCurrency;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: VillaPeriodCurrency) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_88px]">
      <label className="block">
        <span className={labelClass}>{label}</span>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(event) =>
            onAmountChange(sanitizeAmountInput(event.target.value))
          }
          className={`mt-1.5 ${inputClass}`}
        />
      </label>
      <label className="block">
        <span className={labelClass}>Birim</span>
        <div className="mt-1.5">
          <CurrencySelect value={currency} onChange={onCurrencyChange} />
        </div>
      </label>
    </div>
  );
}

export default function VillaPeriodFormModal({
  open,
  villaId,
  period,
  prefillDateRange = null,
  continueAfterSave,
  onClose,
  onSaved,
}: VillaPeriodFormModalProps) {
  const [form, setForm] = useState<PeriodFormState>(emptyFormState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [discountPending, setDiscountPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = period ? periodToFormState(period) : emptyFormState();
    const actionRange = prefillDateRange ?? {
      startDate: base.actionStartDate,
      endDate: base.actionEndDate,
    };

    const nextForm = {
      ...base,
      actionStartDate: actionRange.startDate,
      actionEndDate: actionRange.endDate,
    };

    setForm(
      period
        ? { ...nextForm, occupancySelection: "" }
        : nextForm
    );
    setError(null);
  }, [open, period, prefillDateRange]);

  const nightlyPrice = parseNumber(form.nightlyPrice) ?? 0;
  const nightlyWithoutCommission = parseNumber(form.nightlyPriceWithoutCommission);
  const weeklyPrice = parseNumber(form.weeklyPrice);
  const commissionRate = parseRate(form.commissionRate);

  const commissionAmount = useMemo(
    () => calculateCommissionAmount(nightlyPrice, nightlyWithoutCommission),
    [nightlyPrice, nightlyWithoutCommission]
  );

  const discountPreview = useMemo(
    () =>
      calculateDiscountAmounts(
        nightlyPrice,
        parseRate(form.discount1Rate),
        parseRate(form.discount2Rate),
        parseNumber(form.extraDiscountAmount) ?? 0
      ),
    [
      nightlyPrice,
      form.discount1Rate,
      form.discount2Rate,
      form.extraDiscountAmount,
    ]
  );

  const totalDiscountAmount = useMemo(() => {
    const extra = parseNumber(form.extraDiscountAmount) ?? 0;
    const first = discountPreview.discount1Amount ?? 0;
    const second = discountPreview.discount2Amount ?? 0;
    const total = first + second + extra;
    return total > 0 ? total : null;
  }, [
    discountPreview.discount1Amount,
    discountPreview.discount2Amount,
    form.extraDiscountAmount,
  ]);

  function updateForm(patch: Partial<PeriodFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handlePriceFieldChange(
    field: "nightlyPrice" | "nightlyPriceWithoutCommission" | "weeklyPrice",
    raw: string
  ) {
    const sanitized = sanitizeAmountInput(raw);
    const parsed = parseAmountInput(sanitized);
    const commissionRate = parseRate(form.commissionRate);

    if (!parsed) {
      updateForm({ [field]: sanitized });
      return;
    }

    const source =
      field === "nightlyPrice"
        ? "commissioned"
        : field === "nightlyPriceWithoutCommission"
          ? "withoutCommission"
          : "weekly";

    const synced = syncPeriodPrices({
      source,
      commissioned: source === "commissioned" ? parsed : undefined,
      withoutCommission:
        source === "withoutCommission" ? parsed : undefined,
      weekly: source === "weekly" ? parsed : undefined,
      commissionRate,
    });

    if (synced) {
      updateForm(synced);
      return;
    }

    updateForm({ [field]: sanitized });
  }

  function handleCommissionRateChange(value: string) {
    const commissionRate = parseRate(value);
    const commissioned = parseAmountInput(form.nightlyPrice);
    const weekly = parseAmountInput(form.weeklyPrice);
    const without = parseAmountInput(form.nightlyPriceWithoutCommission);

    let synced = null;
    if (commissioned) {
      synced = syncPeriodPrices({
        source: "commissioned",
        commissioned,
        commissionRate,
      });
    } else if (weekly) {
      synced = syncPeriodPrices({
        source: "weekly",
        weekly,
        commissionRate,
      });
    } else if (without) {
      synced = syncPeriodPrices({
        source: "withoutCommission",
        withoutCommission: without,
        commissionRate,
      });
    }

    updateForm({
      commissionRate: value,
      ...(synced ?? {}),
    });
  }

  if (!open) return null;

  function appendFormFields(
    target: FormData,
    options: {
      includePricing: boolean;
      includeDiscounts: boolean;
      startDate: string;
      endDate: string;
    }
  ) {
    target.set("startDate", options.startDate);
    target.set("endDate", options.endDate);
    target.set("availability", "available");

    Object.entries(form).forEach(([key, value]) => {
      if (FORM_META_FIELDS.has(key)) return;
      if (!options.includePricing && !DISCOUNT_FIELDS.has(key)) return;
      if (!options.includeDiscounts && DISCOUNT_FIELDS.has(key)) return;
      if (value === "") return;

      if (AMOUNT_FIELDS.has(key)) {
        const parsed = parseAmountInput(value);
        if (parsed != null) target.set(key, String(parsed));
        return;
      }

      target.set(key, value);
    });
  }

  async function handleOccupancyAction(mode: "EMPTY" | "BOOKED") {
    if (!form.actionStartDate || !form.actionEndDate) return;

    setError(null);
    setAvailabilityPending(true);

    const result = await updateVillaPeriodDaysOccupancy(
      villaId,
      form.actionStartDate,
      form.actionEndDate,
      mode
    );

    setAvailabilityPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
    onClose();
  }

  function handlePricingSave() {
    if (!form.actionStartDate || !form.actionEndDate) return;

    setError(null);

    const formData = new FormData();
    appendFormFields(formData, {
      includePricing: true,
      includeDiscounts: false,
      startDate: form.actionStartDate,
      endDate: form.actionEndDate,
    });

    startTransition(async () => {
      const result = await updateVillaPricePeriodDaysPricing(villaId, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      onSaved();
      onClose();
    });
  }

  function handleDiscountSave() {
    if (!form.actionStartDate || !form.actionEndDate) return;

    setError(null);
    setDiscountPending(true);

    const formData = new FormData();
    appendFormFields(formData, {
      includePricing: false,
      includeDiscounts: true,
      startDate: form.actionStartDate,
      endDate: form.actionEndDate,
    });

    startTransition(async () => {
      const result = await updateVillaPricePeriodDaysDiscounts(villaId, formData);

      setDiscountPending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      onSaved();
      onClose();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (period) return;

    setError(null);

    const formData = new FormData();
    appendFormFields(formData, {
      includePricing: true,
      includeDiscounts: true,
      startDate: form.actionStartDate,
      endDate: form.actionEndDate,
    });

    startTransition(async () => {
      const result = await createVillaPricePeriod(villaId, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      onSaved();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {period ? "PERİYOD DÜZENLE" : "PERİYOD EKLE"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <section className="overflow-hidden rounded-xl border border-gray-200">
              <SectionHeader
                title="Periyod Aralığı"
                icon={<CalendarDays className="h-4 w-4" />}
                tone="blue"
              />
              <div className="space-y-4 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Başlangıç Tarihi</span>
                    <input
                      type="date"
                      required
                      value={form.actionStartDate}
                      onChange={(event) =>
                        updateForm({ actionStartDate: event.target.value })
                      }
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Bitiş Tarihi</span>
                    <input
                      type="date"
                      required
                      value={form.actionEndDate}
                      onChange={(event) =>
                        updateForm({ actionEndDate: event.target.value })
                      }
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </label>
                </div>

                {period ? (
                  <div>
                    <span className={labelClass}>Uygunluk Durumu</span>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-800">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="occupancySelection"
                          value="EMPTY"
                          checked={form.occupancySelection === "EMPTY"}
                          onChange={() =>
                            updateForm({ occupancySelection: "EMPTY" })
                          }
                        />
                        Uygun
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="occupancySelection"
                          value="BOOKED"
                          checked={form.occupancySelection === "BOOKED"}
                          onChange={() =>
                            updateForm({ occupancySelection: "BOOKED" })
                          }
                        />
                        Dolu
                      </label>
                    </div>

                    {form.occupancySelection === "EMPTY" ? (
                      <button
                        type="button"
                        disabled={
                          availabilityPending ||
                          !form.actionStartDate ||
                          !form.actionEndDate
                        }
                        onClick={() => handleOccupancyAction("EMPTY")}
                        className="mt-3 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Aç
                      </button>
                    ) : null}

                    {form.occupancySelection === "BOOKED" ? (
                      <button
                        type="button"
                        disabled={
                          availabilityPending ||
                          !form.actionStartDate ||
                          !form.actionEndDate
                        }
                        onClick={() => handleOccupancyAction("BOOKED")}
                        className="mt-3 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Kapat
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200">
              <SectionHeader
                title="Period Bilgileri"
                icon={<UserPlus className="h-4 w-4" />}
                tone="gray"
              />
              <div className="space-y-4 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_88px]">
                  <label className="block">
                    <span className={labelClass}>
                      Gecelik Konaklama Komisyonlu
                    </span>
                    <AmountInput
                      required
                      value={form.nightlyPrice}
                      onChange={(value) =>
                        handlePriceFieldChange("nightlyPrice", value)
                      }
                      className="mt-1.5"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Birim</span>
                    <div className="mt-1.5">
                      <CurrencySelect
                        value={form.nightlyPriceCurrency}
                        onChange={(value) =>
                          updateForm({ nightlyPriceCurrency: value })
                        }
                      />
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Haftalık Konaklama Bedeli</span>
                  <AmountInput
                    value={form.weeklyPrice}
                    onChange={(value) =>
                      handlePriceFieldChange("weeklyPrice", value)
                    }
                    className="mt-1.5"
                  />
                  <p className={helpClass}>
                    Haftalık bedel girildiğinde gecelik fiyat otomatik
                    hesaplanır (Haftalık ÷ 7). Gecelik fiyat değiştiğinde bu
                    alan da otomatik güncellenir.
                  </p>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Ön Ödeme Oranı (%)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.prepaymentRate}
                      onChange={(event) =>
                        updateForm({ prepaymentRate: event.target.value })
                      }
                      className={`mt-1.5 ${inputClass} ${noSpinClass}`}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Komisyon Oranı (%)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.commissionRate}
                      onChange={(event) =>
                        handleCommissionRateChange(event.target.value)
                      }
                      className={`mt-1.5 ${inputClass} ${noSpinClass}`}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>
                    İndirimli Gecelik Konaklama Bedeli
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={formatMoneyAmount(discountPreview.discountedNightlyPrice)}
                    className="mt-1.5 w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900"
                  />
                  <p className={helpClass}>
                    Bu alan indirim uygulandığında otomatik hesaplanır. İndirim
                    yoksa komisyonlu fiyat ile aynıdır.
                  </p>
                </label>

                <label className="block">
                  <span className={labelClass}>
                    Gecelik Konaklama Bedeli - Komisyonsuz
                  </span>
                  <AmountInput
                    value={form.nightlyPriceWithoutCommission}
                    onChange={(value) =>
                      handlePriceFieldChange(
                        "nightlyPriceWithoutCommission",
                        value
                      )
                    }
                    className="mt-1.5"
                  />
                  <p className={helpClass}>
                    Komisyonlu fiyattan komisyon oranı düşülerek hesaplanır:
                    Komisyonlu − (Komisyonlu × Komisyon Oranı %). Bu alana
                    değer girildiğinde diğer fiyat alanları da güncellenir.
                  </p>
                </label>

                <label className="block">
                  <span className={labelClass}>Komisyon Tutarı</span>
                  <input
                    type="text"
                    readOnly
                    value={formatMoneyAmount(commissionAmount)}
                    className="mt-1.5 w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900"
                  />
                  <p className={helpClass}>
                    Bu alan otomatik hesaplanır (Komisyonlu Fiyat -
                    Komisyonsuz Fiyat) ve düzenlenemez.
                  </p>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Min Konaklama (Gece)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.minStayNights}
                      onChange={(event) =>
                        updateForm({ minStayNights: event.target.value })
                      }
                      className={`mt-1.5 ${inputClass} ${noSpinClass}`}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Temizlik Gün Sayısı</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.cleaningDayCount}
                      onChange={(event) =>
                        updateForm({ cleaningDayCount: event.target.value })
                      }
                      className={`mt-1.5 ${inputClass} ${noSpinClass}`}
                    />
                  </label>
                </div>

                <FeeRow
                  label="Temizlik Bedeli"
                  amount={form.cleaningFee}
                  currency={form.cleaningFeeCurrency}
                  onAmountChange={(value) => updateForm({ cleaningFee: value })}
                  onCurrencyChange={(value) =>
                    updateForm({ cleaningFeeCurrency: value })
                  }
                />
                <FeeRow
                  label="Hasar Depozitosu"
                  amount={form.damageDeposit}
                  currency={form.damageDepositCurrency}
                  onAmountChange={(value) => updateForm({ damageDeposit: value })}
                  onCurrencyChange={(value) =>
                    updateForm({ damageDepositCurrency: value })
                  }
                />
                <FeeRow
                  label="Evcil Hayvan Temizlik Bedeli"
                  amount={form.petCleaningFee}
                  currency={form.petCleaningFeeCurrency}
                  onAmountChange={(value) =>
                    updateForm({ petCleaningFee: value })
                  }
                  onCurrencyChange={(value) =>
                    updateForm({ petCleaningFeeCurrency: value })
                  }
                />
                <FeeRow
                  label="Evcil Hayvan Hasar Depozitosu"
                  amount={form.petDamageDeposit}
                  currency={form.petDamageDepositCurrency}
                  onAmountChange={(value) =>
                    updateForm({ petDamageDeposit: value })
                  }
                  onCurrencyChange={(value) =>
                    updateForm({ petDamageDepositCurrency: value })
                  }
                />
                <FeeRow
                  label="Yerden Isıtma Bedeli"
                  amount={form.underfloorHeatingFee}
                  currency={form.underfloorHeatingFeeCurrency}
                  onAmountChange={(value) =>
                    updateForm({ underfloorHeatingFee: value })
                  }
                  onCurrencyChange={(value) =>
                    updateForm({ underfloorHeatingFeeCurrency: value })
                  }
                />
                <FeeRow
                  label="Ek Yatak Ücreti"
                  amount={form.extraBedFee}
                  currency={form.extraBedFeeCurrency}
                  onAmountChange={(value) => updateForm({ extraBedFee: value })}
                  onCurrencyChange={(value) =>
                    updateForm({ extraBedFeeCurrency: value })
                  }
                />
                <FeeRow
                  label="Havuz Isıtma (Özel Havuz)"
                  amount={form.poolHeatingPrivateFee}
                  currency={form.poolHeatingPrivateFeeCurrency}
                  onAmountChange={(value) =>
                    updateForm({ poolHeatingPrivateFee: value })
                  }
                  onCurrencyChange={(value) =>
                    updateForm({ poolHeatingPrivateFeeCurrency: value })
                  }
                />
                <FeeRow
                  label="Havuz Isıtma (Kapalı (İç) Havuz)"
                  amount={form.poolHeatingIndoorFee}
                  currency={form.poolHeatingIndoorFeeCurrency}
                  onAmountChange={(value) =>
                    updateForm({ poolHeatingIndoorFee: value })
                  }
                  onCurrencyChange={(value) =>
                    updateForm({ poolHeatingIndoorFeeCurrency: value })
                  }
                />
                <FeeRow
                  label="Havuz Isıtma (Çocuk Havuzu)"
                  amount={form.poolHeatingKidsFee}
                  currency={form.poolHeatingKidsFeeCurrency}
                  onAmountChange={(value) =>
                    updateForm({ poolHeatingKidsFee: value })
                  }
                  onCurrencyChange={(value) =>
                    updateForm({ poolHeatingKidsFeeCurrency: value })
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Hafta Sonu Gecelik Fiyat</span>
                    <AmountInput
                      value={form.weekendPrice}
                      onChange={(value) => updateForm({ weekendPrice: value })}
                      className="mt-1.5"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Hafta Sonu Günleri</span>
                    <input
                      type="text"
                      value={form.weekendDays}
                      onChange={(event) =>
                        updateForm({ weekendDays: event.target.value })
                      }
                      placeholder="5,6 (Cum,Cts)"
                      className={`mt-1.5 ${inputClass}`}
                    />
                    <p className={helpClass}>
                      0=Pazar, 1=Pazartesi … 6=Cumartesi. Virgülle ayırın.
                    </p>
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Hafta Sonu Min Konaklama (Gece)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.weekendMinStayNights}
                    onChange={(event) =>
                      updateForm({ weekendMinStayNights: event.target.value })
                    }
                    className={`mt-1.5 ${inputClass} ${noSpinClass}`}
                  />
                </label>

                <FeeRow
                  label="0-2 Yaş Çocuk Ücreti"
                  amount={form.childFee02}
                  currency={form.childFee02Currency}
                  onAmountChange={(value) => updateForm({ childFee02: value })}
                  onCurrencyChange={(value) =>
                    updateForm({ childFee02Currency: value })
                  }
                />
                <FeeRow
                  label="3-9 Yaş Çocuk Ücreti"
                  amount={form.childFee03_09}
                  currency={form.childFee03_09Currency}
                  onAmountChange={(value) => updateForm({ childFee03_09: value })}
                  onCurrencyChange={(value) =>
                    updateForm({ childFee03_09Currency: value })
                  }
                />
                {period ? (
                  <button
                    type="button"
                    disabled={isPending || !form.actionStartDate || !form.actionEndDate}
                    onClick={handlePricingSave}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isPending ? "Kaydediliyor..." : "Periyot Kaydet"}
                  </button>
                ) : null}
              </div>
            </section>

            {!period ? (
              <VillaPeriodRangePreview
                startDate={form.actionStartDate}
                endDate={form.actionEndDate}
                nightlyPrice={form.nightlyPrice}
                nightlyPriceCurrency={form.nightlyPriceCurrency}
                availability="available"
              />
            ) : null}

            <section className="overflow-hidden rounded-xl border border-teal-200">
              <SectionHeader
                title="İndirim Bilgileri"
                icon={<Save className="h-4 w-4" />}
                tone="teal"
              />
              <div className="space-y-4 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>1. İndirim Oranı (%)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.discount1Rate}
                      onChange={(event) =>
                        updateForm({ discount1Rate: event.target.value })
                      }
                      className={`mt-1.5 ${inputClass} ${noSpinClass}`}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>1. İndirim Tutarı</span>
                    <input
                      type="text"
                      readOnly
                      value={formatMoneyAmount(discountPreview.discount1Amount)}
                      className="mt-1.5 w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>2. İndirim Oranı (%)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.discount2Rate}
                      onChange={(event) =>
                        updateForm({ discount2Rate: event.target.value })
                      }
                      className={`mt-1.5 ${inputClass} ${noSpinClass}`}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>2. İndirim Tutarı</span>
                    <input
                      type="text"
                      readOnly
                      value={formatMoneyAmount(discountPreview.discount2Amount)}
                      className="mt-1.5 w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Extra İndirim Tutarı</span>
                  <AmountInput
                    value={form.extraDiscountAmount}
                    onChange={(value) =>
                      updateForm({ extraDiscountAmount: value })
                    }
                    className="mt-1.5"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Toplam İndirim Tutarı</span>
                    <input
                      type="text"
                      readOnly
                      value={formatMoneyAmount(totalDiscountAmount)}
                      className="mt-1.5 w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>İndirimli Fiyat</span>
                    <input
                      type="text"
                      readOnly
                      value={formatMoneyAmount(
                        discountPreview.discountedNightlyPrice
                      )}
                      className="mt-1.5 w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
                    />
                  </label>
                </div>
                <p className={helpClass}>
                  1. ve 2. indirim tutarları ile extra tutar toplanır; indirimli
                  fiyat = komisyonlu gecelik fiyat − toplam indirim tutarıdır.
                  Hafta sonu günlerinde takvimde hafta sonu fiyatı üzerinden
                  hesaplanır.
                </p>

                <button
                  type="button"
                  disabled={
                    discountPending || !form.actionStartDate || !form.actionEndDate
                  }
                  onClick={handleDiscountSave}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {discountPending
                    ? "Güncelleniyor..."
                    : "İndirim Bilgilerini Güncelle"}
                </button>
              </div>
            </section>
          </div>

          {!period ? (
            <div className="border-t border-gray-100 p-5">
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Kaydediliyor..." : "Periyot Kaydet"}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
