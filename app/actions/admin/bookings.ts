"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { StayStatus } from "@/lib/stay-status";
import { z } from "zod";
import {
  createAdminBooking,
  updateAdminBooking,
  updateBookingDetail,
  updateBookingStatus,
} from "@/lib/queries/bookings";
import { getAdminBookingDetail } from "@/lib/queries/admin-booking-detail";
import {
  resolveBookingPeriodFees,
  resolveBookingPrepaymentRate,
} from "@/lib/queries/booking-prepayment";
import {
  getAdminBookingWizardVillas,
  resolveAdminBookingWizardQuote,
} from "@/lib/queries/admin-booking-wizard";
import { requireAdmin } from "@/lib/auth-helpers";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import {
  computeEntrancePayment,
  computeReservationTotal,
  type BookingDetails,
  type BookingGuestEntry,
} from "@/lib/booking-form-details";
import {
  isValidTcKimlik,
  normalizeTcKimlik,
  validateOptionalTcKimlikFields,
} from "@/lib/tc-kimlik";
import { normalizeStoredTurkishPhone } from "@/lib/phone-utils";

const bookingStatusSchema = z.nativeEnum(BookingStatus);

const optionalMoney = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return null;
    const parsed = Number(String(value).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  });

const adminBookingSchema = z.object({
  villaId: z.string().min(1, "Villa seçin"),
  checkIn: z.string().min(1, "Giriş tarihi gerekli"),
  checkOut: z.string().min(1, "Çıkış tarihi gerekli"),
  adults: z.coerce.number().min(1, "En az 1 yetişkin gerekli"),
  children: z.coerce.number().min(0).default(0),
  babies: z.coerce.number().min(0).default(0),
  pets: z.coerce.number().min(0).default(0),
  guestName: z.string().min(2, "Ad soyad gerekli"),
  guestEmail: z.string().min(3, "E-posta gerekli"),
  guestPhone: z
    .string()
    .min(1, "Telefon gerekli")
    .transform((value) => normalizeStoredTurkishPhone(value))
    .refine((value) => value.length >= 12, "Geçerli telefon girin"),
  grossPrice: optionalMoney,
  ownerDiscountRate: z.coerce.number().min(0).max(100).optional().default(0),
  ownerDiscountAmount: optionalMoney,
  agencyDiscountRate: z.coerce.number().min(0).max(100).optional().default(0),
  agencyDiscountAmount: optionalMoney,
  prepaymentRate: z.coerce.number().min(0).max(100).optional().default(20),
  extraAccommodationFee: optionalMoney,
  cleaningFee: optionalMoney,
  petCleaningFee: optionalMoney,
  poolHeatingPrivateFee: optionalMoney,
  poolHeatingIndoorFee: optionalMoney,
  poolHeatingKidsFee: optionalMoney,
  underfloorHeatingFee: optionalMoney,
  prepaymentAmount: optionalMoney,
  prepaymentMethod: z.string().optional().default(""),
  customerNote: z.string().optional().default(""),
  guestTc: z
    .string()
    .optional()
    .default("")
    .transform((value) => normalizeTcKimlik(value))
    .refine(
      (value) => !value || isValidTcKimlik(value),
      "Geçersiz T.C. Kimlik No"
    ),
  damageDeposit: optionalMoney,
  totalPrice: optionalMoney,
  status: bookingStatusSchema,
});

export type AdminBookingActionState = {
  success?: boolean;
  error?: string;
};

function parseAdminBookingForm(formData: FormData) {
  return adminBookingSchema.safeParse({
    villaId: formData.get("villaId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults"),
    children: formData.get("children") ?? 0,
    babies: formData.get("babies") ?? 0,
    pets: formData.get("pets") ?? 0,
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    guestPhone: formData.get("guestPhone"),
    grossPrice: formData.get("grossPrice"),
    ownerDiscountRate: formData.get("ownerDiscountRate") ?? 0,
    ownerDiscountAmount: formData.get("ownerDiscountAmount"),
    agencyDiscountRate: formData.get("agencyDiscountRate") ?? 0,
    agencyDiscountAmount: formData.get("agencyDiscountAmount"),
    prepaymentRate: formData.get("prepaymentRate") ?? 20,
    extraAccommodationFee: formData.get("extraAccommodationFee"),
    cleaningFee: formData.get("cleaningFee"),
    petCleaningFee: formData.get("petCleaningFee"),
    poolHeatingPrivateFee: formData.get("poolHeatingPrivateFee"),
    poolHeatingIndoorFee: formData.get("poolHeatingIndoorFee"),
    poolHeatingKidsFee: formData.get("poolHeatingKidsFee"),
    underfloorHeatingFee: formData.get("underfloorHeatingFee"),
    prepaymentAmount: formData.get("prepaymentAmount"),
    prepaymentMethod: formData.get("prepaymentMethod"),
    customerNote: formData.get("customerNote"),
    guestTc: formData.get("guestTc"),
    damageDeposit: formData.get("damageDeposit"),
    totalPrice: formData.get("totalPrice"),
    status: formData.get("status"),
  });
}

function buildBookingDetailsFromAdminForm(
  data: z.infer<typeof adminBookingSchema>
): BookingDetails {
  const details: BookingDetails = {
    grossPrice: data.grossPrice,
    ownerDiscountRate: data.ownerDiscountRate,
    ownerDiscountAmount: data.ownerDiscountAmount ?? 0,
    discountRate: data.ownerDiscountRate,
    discountAmount: data.ownerDiscountAmount ?? 0,
    agencyDiscountRate: data.agencyDiscountRate,
    agencyDiscountAmount: data.agencyDiscountAmount ?? 0,
    prepaymentRate: data.prepaymentRate,
    extraAccommodationFee: data.extraAccommodationFee,
    cleaningFee: data.cleaningFee,
    petCleaningFee: data.petCleaningFee,
    poolHeatingPrivateFee: data.poolHeatingPrivateFee,
    poolHeatingIndoorFee: data.poolHeatingIndoorFee,
    poolHeatingKidsFee: data.poolHeatingKidsFee,
    underfloorHeatingFee: data.underfloorHeatingFee,
    prepaymentAmount: data.prepaymentAmount,
    damageDeposit: data.damageDeposit,
    importPaymentMethod: data.prepaymentMethod,
    prepaymentBank: data.prepaymentMethod,
    customerNote: data.customerNote,
    guestTc: data.guestTc || undefined,
    siteInfo: "TATİL VİLLACISI",
  };
  const reservationTotal = computeReservationTotal(details);
  details.checkInPayment = computeEntrancePayment(
    reservationTotal,
    data.prepaymentAmount
  );
  return details;
}

function resolveAdminBookingTotalPrice(
  data: z.infer<typeof adminBookingSchema>
): number | null {
  if (data.totalPrice != null) return data.totalPrice;
  return computeReservationTotal(buildBookingDetailsFromAdminForm(data));
}

function collectBookingDetailsTcFields(
  details: BookingDetails
): Array<{ value: string | null | undefined; label: string }> {
  const fields: Array<{ value: string | null | undefined; label: string }> = [
    { value: details.guestTc, label: "Müşteri T.C." },
  ];

  const guestGroups: Array<{ title: string; rows?: BookingGuestEntry[] }> = [
    { title: "Yetişkin", rows: details.adultGuests },
    { title: "Çocuk", rows: details.childGuests },
    { title: "Bebek", rows: details.babyGuests },
  ];

  for (const group of guestGroups) {
    for (const [index, guest] of (group.rows ?? []).entries()) {
      fields.push({
        value: guest.nationalId,
        label: `${group.title} misafir ${index + 1}`,
      });
    }
  }

  return fields;
}

function validateBookingDetailsTc(details: BookingDetails): string | null {
  return validateOptionalTcKimlikFields(collectBookingDetailsTcFields(details));
}

export async function createAdminBookingAction(
  _prevState: AdminBookingActionState,
  formData: FormData
): Promise<AdminBookingActionState> {
  await requireAdmin();

  const parsed = parseAdminBookingForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const {
    checkIn,
    checkOut,
    grossPrice: _grossPrice,
    extraAccommodationFee: _extraAccommodationFee,
    cleaningFee: _cleaningFee,
    petCleaningFee: _petCleaningFee,
    poolHeatingPrivateFee: _poolHeatingPrivateFee,
    poolHeatingIndoorFee: _poolHeatingIndoorFee,
    poolHeatingKidsFee: _poolHeatingKidsFee,
    underfloorHeatingFee: _underfloorHeatingFee,
    prepaymentAmount: _prepaymentAmount,
    prepaymentMethod: _prepaymentMethod,
    damageDeposit: _damageDeposit,
    totalPrice: _formTotalPrice,
    ...rest
  } = parsed.data;
  const details = buildBookingDetailsFromAdminForm(parsed.data);
  const totalPrice = resolveAdminBookingTotalPrice(parsed.data);

  try {
    await createAdminBooking({
      ...rest,
      totalPrice,
      details,
      checkIn: new Date(`${checkIn}T00:00:00.000Z`),
      checkOut: new Date(`${checkOut}T00:00:00.000Z`),
    });
    revalidatePath("/admin/rezervasyonlar");
    revalidatePath("/admin/musteri-yonetimi");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Rezervasyon oluşturulamadı",
    };
  }
}

export async function updateAdminBookingAction(
  _prevState: AdminBookingActionState,
  formData: FormData
): Promise<AdminBookingActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Rezervasyon kimliği eksik" };

  const parsed = parseAdminBookingForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const {
    checkIn,
    checkOut,
    grossPrice: _grossPrice,
    extraAccommodationFee: _extraAccommodationFee,
    cleaningFee: _cleaningFee,
    petCleaningFee: _petCleaningFee,
    poolHeatingPrivateFee: _poolHeatingPrivateFee,
    poolHeatingIndoorFee: _poolHeatingIndoorFee,
    poolHeatingKidsFee: _poolHeatingKidsFee,
    underfloorHeatingFee: _underfloorHeatingFee,
    prepaymentAmount: _prepaymentAmount,
    prepaymentMethod: _prepaymentMethod,
    damageDeposit: _damageDeposit,
    totalPrice: _formTotalPrice,
    ...rest
  } = parsed.data;
  const details = buildBookingDetailsFromAdminForm(parsed.data);
  const totalPrice = resolveAdminBookingTotalPrice(parsed.data);

  try {
    await updateAdminBooking(id, {
      ...rest,
      totalPrice,
      details,
      checkIn: new Date(`${checkIn}T00:00:00.000Z`),
      checkOut: new Date(`${checkOut}T00:00:00.000Z`),
    });
    revalidatePath("/admin/rezervasyonlar");
    revalidatePath("/admin/musteri-yonetimi");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Rezervasyon güncellenemedi",
    };
  }
}

export async function changeBookingStatus(id: string, status: BookingStatus) {
  await requireAdmin();
  await updateBookingStatus(id, status);
  revalidatePath("/admin/rezervasyonlar");
}

const stayStatusSchema = z.enum([
  StayStatus.BEKLENIYOR,
  StayStatus.YAPILDI,
  StayStatus.YAPILMADI,
]);

const bookingDetailSchema = z.object({
  id: z.string().min(1),
  status: bookingStatusSchema,
  stayStatus: stayStatusSchema,
  checkIn: z.string().min(1, "Giriş tarihi gerekli"),
  checkOut: z.string().min(1, "Çıkış tarihi gerekli"),
  adults: z.coerce.number().min(1),
  children: z.coerce.number().min(0),
  babies: z.coerce.number().min(0),
  guestName: z.string().min(2),
  guestEmail: z.string().min(3),
  guestPhone: z
    .string()
    .min(1)
    .transform((value) => normalizeStoredTurkishPhone(value)),
  totalPrice: z.number().nullable(),
  details: z.record(z.string(), z.unknown()),
});

export async function getBookingDetailAction(id: string) {
  await requireAdmin();
  return getAdminBookingDetail(id);
}

export async function getBookingPrepaymentRateAction(
  villaId: string,
  checkIn: string
) {
  await requireAdmin();
  if (!villaId || !checkIn) return 20;
  return resolveBookingPrepaymentRate(
    villaId,
    new Date(`${checkIn}T00:00:00.000Z`)
  );
}

export async function getBookingPeriodFeesAction(
  villaId: string,
  checkIn: string
) {
  await requireAdmin();
  if (!villaId || !checkIn) {
    return {
      extraAccommodationFee: null,
      cleaningFee: null,
      petCleaningFee: null,
      poolHeatingPrivateFee: null,
      poolHeatingIndoorFee: null,
      poolHeatingKidsFee: null,
      underfloorHeatingFee: null,
    };
  }
  return resolveBookingPeriodFees(
    villaId,
    new Date(`${checkIn}T00:00:00.000Z`)
  );
}

export async function updateBookingDetailAction(
  payload: z.infer<typeof bookingDetailSchema>
): Promise<AdminBookingActionState> {
  await requireAdmin();

  const parsed = bookingDetailSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    };
  }

  const details = parsed.data.details as BookingDetails;
  const tcError = validateBookingDetailsTc(details);
  if (tcError) {
    return { error: tcError };
  }

  try {
    await updateBookingDetail({
      id: parsed.data.id,
      status: parsed.data.status,
      stayStatus: parsed.data.stayStatus,
      checkIn: new Date(`${parsed.data.checkIn}T00:00:00.000Z`),
      checkOut: new Date(`${parsed.data.checkOut}T00:00:00.000Z`),
      adults: parsed.data.adults,
      children: parsed.data.children,
      babies: parsed.data.babies,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      guestPhone: parsed.data.guestPhone,
      totalPrice: parsed.data.totalPrice,
      details,
    });
    revalidatePath("/admin/rezervasyonlar");
    revalidatePath("/admin/musteri-yonetimi");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Rezervasyon güncellenemedi",
    };
  }
}

const DEFAULT_SITE_INFO = "TATİL VİLLACISI";

export async function getSiteInfoOptionsAction(): Promise<string[]> {
  await requireAdmin();

  const sites = await getAgencySitesForPicker();
  const names = sites.map((site) => site.name.trim()).filter(Boolean);
  const unique = new Set(names);

  unique.add(DEFAULT_SITE_INFO);

  return Array.from(unique).sort((a, b) =>
    a.localeCompare(b, "tr", { sensitivity: "base" })
  );
}

export async function getAdminBookingWizardVillasAction() {
  await requireAdmin();
  return getAdminBookingWizardVillas();
}

export async function getAdminBookingWizardQuoteAction(
  villaId: string,
  checkIn: string,
  checkOut: string
) {
  await requireAdmin();
  if (!villaId || !checkIn || !checkOut) return null;
  return resolveAdminBookingWizardQuote(villaId, checkIn, checkOut);
}
