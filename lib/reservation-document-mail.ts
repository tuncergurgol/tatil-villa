import {
  computeGuestReservationTotal,
  computeNetPrice,
  listPositiveExtraFees,
  parseBookingDetails,
  resolveExternalCode,
  type BookingGuestEntry,
  formatGuestFullName,
} from "@/lib/booking-form-details";
import {
  getCompanyPaymentTypeLabel,
  normalizeCompanyPaymentType,
} from "@/lib/company-payment-types";
import { prisma } from "@/lib/db";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { prepareCompanyLogoForEmail } from "@/lib/email-logo";
import { INTEGRATION_LEAD_NOTIFY_WHATSAPP } from "@/lib/integration-lead-notify";
import { calculateNights } from "@/lib/stay-nights";
import {
  normalizeActivityLogs,
  resolveBookingConfirmedAtFromLogs,
} from "@/lib/booking-activity-log-core";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import { getAgencyMessageTemplateByRowNo } from "@/lib/queries/agency-message-templates";
import {
  sendCustomerNotificationWhatsAppSequence,
  sendOperationsWhatsApp,
} from "@/lib/whatsapp-delivery";
import {
  appendBookingSiteFooter,
  resolveBookingSiteBrand,
} from "@/lib/booking-site-brand";
import { formatVillaRegionLabelMahalleIlceIl } from "@/lib/queries/villa-location";
import {
  applyReservationContractPlaceholders,
  loadOnlineReservationContractBody,
} from "@/lib/reservation-document-contract";
import {
  buildReservationDocumentPdf,
  maskIdentityNumber,
  type ReservationDocumentData,
  type ReservationDocumentGuestRow,
} from "@/lib/reservation-document-pdf";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import { resolvePaymentMethodLabel } from "@/lib/booking-display";
import {
  ensureWhatsAppRawConfirmationUrl,
  normalizeVillaTimeHHMM,
  renderAgencyMessageTemplate,
  resolveCompanyLogoUrl,
} from "@/lib/agency-message-render";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_10_5,
  AGENCY_MESSAGE_TEMPLATE_ROW_10_6,
  AGENCY_MESSAGE_TEMPLATE_ROW_20_5,
} from "@/lib/agency-message-row-no";
import {
  RESERVATION_DOCUMENT_SENT_MAIL_BODY,
  RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY,
} from "@/lib/agency-message-templates/reservation-document-sent";
import { RESERVATION_CONFIRMED_FOLLOWUP_WHATSAPP_BODY } from "@/lib/agency-message-templates/reservation-confirmed-followup";
import type { Attachment } from "nodemailer/lib/mailer";

/** Yönetim kopyası (20.5) — BCC yerine ayrı şablon maili */
const RESERVATION_DOCUMENT_MANAGEMENT_EMAIL = "info@tatildeyiz.com.tr";
const RESERVATION_DOCUMENT_FROM_EMAIL = "rezervasyon@tatildeyiz.com.tr";

function guestFullName(guest: BookingGuestEntry): string {
  return formatGuestFullName(guest);
}

function mapGuestRows(
  adults: BookingGuestEntry[],
  children: BookingGuestEntry[],
  babies: BookingGuestEntry[]
): ReservationDocumentGuestRow[] {
  const map = (
    rows: BookingGuestEntry[],
    category: ReservationDocumentGuestRow["category"]
  ) =>
    rows
      .map((guest) => ({
        fullName: guestFullName(guest),
        identityMasked: maskIdentityNumber(guest.nationalId),
        category,
      }))
      .filter((row) => row.fullName);

  return [
    ...map(adults, "adult"),
    ...map(children, "child"),
    ...map(babies, "baby"),
  ];
}

function formatDateRangeLabel(checkIn: Date, checkOut: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  return `${fmt(checkIn)} - ${fmt(checkOut)}`;
}

function resolvePrepaymentMethodLabel(
  channel: string | null | undefined,
  detailsPaymentMethod: string | null | undefined
): string {
  const raw =
    channel?.trim() ||
    detailsPaymentMethod?.trim() ||
    "";
  if (!raw) return "—";
  const normalized = normalizeCompanyPaymentType(raw);
  const companyLabel = getCompanyPaymentTypeLabel(normalized);
  if (companyLabel && companyLabel !== normalized) {
    if (normalized === "credit_card") return "Kredi Kartı";
    if (normalized === "bank_transfer") return "Havale / EFT";
    return companyLabel;
  }
  const publicLabel = resolvePaymentMethodLabel(raw);
  if (publicLabel === "Kredi Kartı") return "Kredi Kartı";
  return publicLabel;
}

/**
 * Onaylanmış rezervasyondan PDF veri modeli üretir.
 */
export async function buildReservationDocumentDataForBooking(
  bookingId: string,
  options?: { clientIp?: string; confirmedAt?: Date }
): Promise<ReservationDocumentData> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      villa: {
        select: {
          name: true,
          checkInTime: true,
          checkOutTime: true,
          location: true,
          region: {
            select: {
              name: true,
              parent: {
                select: {
                  name: true,
                  parent: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      prepayments: {
        select: { amount: true, paymentChannel: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!booking) {
    throw new Error("Rezervasyon bulunamadı");
  }

  const details = parseBookingDetails(booking.details);
  const [company, contractSource, agencySites] = await Promise.all([
    getCompanySettings(),
    loadOnlineReservationContractBody(),
    getAgencySitesForPicker(),
  ]);
  const siteBrand = resolveBookingSiteBrand({
    siteInfo: details.siteInfo,
    originDomain: details.originDomain,
    company: {
      brandName: company.brandName,
      domain: company.domain,
      logoUrl: company.logoUrl,
    },
    agencySites,
  });

  const reservationCode =
    resolveExternalCode(booking.externalCode, booking.guestEmail) ||
    booking.id;
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const primaryIdentity =
    details.guestTc ||
    details.adultGuests?.[0]?.nationalId ||
    "";
  const addressParts = [
    details.guestAddress,
    details.guestDistrict,
    details.guestCity,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  const address = addressParts.join(", ") || "—";

  const periodDiscount =
    details.ownerDiscountAmount ?? details.discountAmount ?? null;
  const otherDiscount = details.agencyDiscountAmount ?? null;
  const netAccommodation = computeNetPrice(details);
  const prepaymentFromRecords = booking.prepayments.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const prepayment =
    prepaymentFromRecords > 0
      ? prepaymentFromRecords
      : (details.prepaymentAmount ?? 0);
  // Rezervasyon tutarı = bakiye + ön ödeme + ekstra bedeller (PDF “Rezervasyon Toplamı”)
  const reservationTotal =
    computeGuestReservationTotal(details) ??
    booking.totalPrice ??
    netAccommodation ??
    details.grossPrice ??
    null;
  // Kapıda kalan = Rezervasyon tutarı − yapılan ön ödeme
  const remainingAtCheckIn =
    reservationTotal != null
      ? Math.max(0, reservationTotal - prepayment)
      : null;

  const regionLabel = booking.villa.region
    ? formatVillaRegionLabelMahalleIlceIl(booking.villa.region)
    : booking.villa.location || "—";

  const dateRangeLabel = formatDateRangeLabel(
    booking.checkIn,
    booking.checkOut
  );
  const identityMasked = maskIdentityNumber(primaryIdentity);
  const contractBody = applyReservationContractPlaceholders(
    contractSource.body,
    {
      guestName: booking.guestName,
      identityMasked,
      address,
      villaName: booking.villa.name,
      dateRangeLabel,
      reservationCode,
      brandDomain: siteBrand.domain || company.domain || company.brandName,
    }
  );

  const adultGuests = details.adultGuests ?? [];
  const childGuests = details.childGuests ?? [];
  const babyGuests = details.babyGuests ?? [];

  // Tarihler DB date — yerel gün için dateKey üzerinden gösterim
  const checkIn = new Date(`${dbDateToDateKey(booking.checkIn)}T12:00:00`);
  const checkOut = new Date(`${dbDateToDateKey(booking.checkOut)}T12:00:00`);
  const confirmedAt =
    options?.confirmedAt ??
    resolveBookingConfirmedAtFromLogs(
      normalizeActivityLogs(details.activityLogs),
      booking.confirmationSentAt
    ) ??
    new Date();

  return {
    reservationCode,
    issuedAt: confirmedAt,
    confirmedAt,
    clientIp: options?.clientIp,
    guest: {
      fullName: booking.guestName,
      identityMasked,
      phone: booking.guestPhone.replace(/\D/g, "") || booking.guestPhone,
      email: booking.guestEmail,
      address,
    },
    stay: {
      villaName: booking.villa.name,
      regionLabel,
      checkIn,
      checkOut,
      checkInTime: booking.villa.checkInTime || "16:00",
      checkOutTime: booking.villa.checkOutTime || "10:00",
      nights,
      adults: booking.adults,
      children: booking.children,
      babies: booking.babies,
    },
    guestRows: mapGuestRows(adultGuests, childGuests, babyGuests),
    payments: {
      grossPrice: details.grossPrice ?? booking.totalPrice ?? null,
      periodDiscount:
        periodDiscount != null && periodDiscount > 0 ? periodDiscount : null,
      otherDiscount:
        otherDiscount != null && otherDiscount > 0 ? otherDiscount : null,
      netAccommodation,
      extraFees: listPositiveExtraFees(details).map(({ label, amount }) => ({
        label,
        amount,
      })),
      reservationTotal,
      damageDeposit: details.damageDeposit ?? null,
      prepayment: prepayment > 0 ? prepayment : null,
      prepaymentMethodLabel: resolvePrepaymentMethodLabel(
        booking.prepayments[0]?.paymentChannel,
        details.importPaymentMethod || details.paymentMethod || details.prepaymentBank
      ),
      remainingAtCheckIn,
    },
    company: {
      brandName: siteBrand.siteInfo || company.brandName || "tatildeyiz.com.tr",
      domain: siteBrand.domain || company.domain,
      agencyName: company.agencyName || "",
      companyTitle: company.companyTitle || "",
      tursabNo: company.tursabNo || "",
      address: company.address || "",
      phone: company.phone || "",
      whatsapp: company.whatsapp || company.phone || "",
      email: company.email || RESERVATION_DOCUMENT_MANAGEMENT_EMAIL,
      logoUrl: siteBrand.logoUrl || company.logoUrl || undefined,
      taxOffice: company.taxOffice || undefined,
      taxNumber: company.taxNumber || undefined,
    },
    contractBody,
  };
}

function formatDocumentDateNumeric(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function setTemplateAlias(
  values: Record<string, string>,
  aliases: string[],
  value: string
) {
  for (const alias of aliases) {
    values[alias] = value;
  }
}

/** Mesaj İçeriği 10.5 placeholder’ları — site adı / logo URL dahil. */
export function buildReservationDocumentTemplateValues(
  data: ReservationDocumentData
): Record<string, string> {
  const siteName = (data.company.brandName || "").trim();
  const firmPhone = (data.company.phone || "").trim();
  const firmEmail = (data.company.email || RESERVATION_DOCUMENT_MANAGEMENT_EMAIL).trim();
  const firmAddress = (data.company.address || "").trim();
  const checkInTime = normalizeVillaTimeHHMM(data.stay.checkInTime || "16:00");
  const checkOutTime = normalizeVillaTimeHHMM(
    data.stay.checkOutTime || "10:00"
  );
  const absoluteLogoUrl = resolveCompanyLogoUrl(
    data.company.logoUrl,
    data.company.domain
  );

  const values: Record<string, string> = {};
  setTemplateAlias(
    values,
    ["MUSTERIADI", "MÜŞTERİADI", "MISAFIRADI", "MİSAFİRADI"],
    data.guest.fullName
  );
  setTemplateAlias(
    values,
    ["REZKOD", "REZNO", "REZERVASYONKODU", "REZERVASYONKOD", "REZID"],
    data.reservationCode
  );
  setTemplateAlias(
    values,
    ["TESISADI", "TESİSADI", "VILLAADI", "VİLLAADI", "VVILLAADI"],
    data.stay.villaName
  );
  setTemplateAlias(
    values,
    ["GIRISTARIHI", "GİRİŞTARİHİ", "TARIH1"],
    formatDocumentDateNumeric(data.stay.checkIn)
  );
  setTemplateAlias(
    values,
    ["CIKISTARIHI", "ÇIKIŞTARİHİ", "TARIH2"],
    formatDocumentDateNumeric(data.stay.checkOut)
  );
  setTemplateAlias(values, ["VILLACHECKIN", "GIRISSAATI"], checkInTime);
  setTemplateAlias(values, ["VILLACHECKOUT", "CIKISSAATI"], checkOutTime);
  setTemplateAlias(
    values,
    ["FIRMAADI", "FİRMAADI", "SITEADI", "SİTEADI"],
    siteName
  );
  // Mail HTML’de img olarak basılır; metinde boş bırakılır
  setTemplateAlias(values, ["SITELOGO", "SİTELOGO", "LOGO"], "");
  setTemplateAlias(values, ["SITELOGOURL", "LOGOURL"], absoluteLogoUrl);
  setTemplateAlias(values, ["SIRKETADRES", "ADRES"], firmAddress);
  setTemplateAlias(
    values,
    ["SIRKETTELEFON", "FIRMATEL", "FIRMATELEFON"],
    firmPhone
  );
  setTemplateAlias(values, ["SIRKETMAIL", "INFOMAIL"], firmEmail);
  return values;
}

function pickDocumentChannelBody(
  template: {
    smsBody: string;
    whatsappBody: string;
    mailBody: string;
  } | null,
  channel: "email" | "whatsapp"
): string {
  if (!template) {
    return channel === "email"
      ? RESERVATION_DOCUMENT_SENT_MAIL_BODY
      : RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY;
  }
  if (channel === "whatsapp") {
    return (
      template.whatsappBody ||
      template.smsBody ||
      template.mailBody ||
      RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY
    );
  }
  return (
    template.mailBody ||
    template.whatsappBody ||
    template.smsBody ||
    RESERVATION_DOCUMENT_SENT_MAIL_BODY
  );
}

function resolveDocumentFromName(data: ReservationDocumentData): string {
  return (
    data.company.domain?.trim() ||
    data.company.brandName?.trim() ||
    "tatildeyiz.com.tr"
  );
}

export type ReservationDocumentChannel =
  | "email"
  | "whatsapp"
  | "management_email"
  | "management_whatsapp";

export type ReservationDocumentChannelResult = {
  channel: ReservationDocumentChannel;
  ok: boolean;
  error?: string;
};

async function sendManagementDocumentWhatsApp(input: {
  template: {
    smsBody: string;
    whatsappBody: string;
    mailBody: string;
  } | null;
  fallbackTemplate: {
    smsBody: string;
    whatsappBody: string;
    mailBody: string;
  } | null;
  values: Record<string, string>;
  brandName: string;
}): Promise<ReservationDocumentChannelResult> {
  const text = appendBookingSiteFooter(
    renderAgencyMessageTemplate(
      pickDocumentChannelBody(
        input.template ?? input.fallbackTemplate,
        "whatsapp"
      ),
      input.values
    ),
    input.brandName
  ).trim();

  if (!text) {
    return {
      channel: "management_whatsapp",
      ok: false,
      error: "20.5 WhatsApp metni boş",
    };
  }

  const wa = await sendOperationsWhatsApp(
    INTEGRATION_LEAD_NOTIFY_WHATSAPP,
    text
  );
  return {
    channel: "management_whatsapp",
    ok: wa.ok,
    error: wa.ok ? undefined : wa.error,
  };
}

/**
 * PDF üretip misafire 10.5 e-posta gönderir (PDF ek).
 * Yönetim kopyası sendReservationDocumentNotifications içinde 20.5 ile gider.
 */
export async function sendReservationDocumentEmail(
  bookingId: string,
  options?: { clientIp?: string; confirmedAt?: Date }
): Promise<{ reservationCode: string; pdfBytes: number }> {
  const data = await buildReservationDocumentDataForBooking(bookingId, options);
  const pdfBuffer = await buildReservationDocumentPdf(data);

  if (!pdfBuffer.length) {
    throw new Error("PDF buffer boş üretildi");
  }

  const email = data.guest.email.trim();
  if (!email || isImportedPlaceholderEmail(email)) {
    throw new Error("Geçerli misafir e-postası yok; belge maili atlandı");
  }

  const [company, template] = await Promise.all([
    getCompanySettings(),
    getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_5),
  ]);
  const emailLogo = await prepareCompanyLogoForEmail(
    data.company.logoUrl,
    data.company.domain
  );
  const values = buildReservationDocumentTemplateValues(data);
  const text = renderAgencyMessageTemplate(
    pickDocumentChannelBody(template, "email"),
    values
  );
  const attachments: Attachment[] = [
    ...(emailLogo.attachments ?? []),
    {
      filename: `rezervasyon-belgesi-${data.reservationCode}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];

  await sendCompanyMail(company, {
    to: email,
    fromEmail: RESERVATION_DOCUMENT_FROM_EMAIL,
    fromName: resolveDocumentFromName(data),
    subject: `${data.reservationCode} nolu rezervasyon belgeniz`,
    text,
    html: toHtmlFromText(text, { logoUrl: emailLogo.src }),
    attachments,
  });

  return {
    reservationCode: data.reservationCode,
    pdfBytes: pdfBuffer.length,
  };
}

/**
 * Misafir onayından sonra konfirme belgesi:
 * - 10.5 → misafir e-posta (PDF)
 * - 20.5 → yönetim e-posta info@ (aynı gövde + PDF)
 * - 20.5 → Takvim WhatsApp → +902526180108 (Evolution)
 * - 10.5 → misafir WhatsApp (metin)
 * - 10.6 → misafir WhatsApp 2. mesaj (onay bilgilendirme)
 * Kanal hatalarını fırlatmaz; sonuçları döner (UI success bozulmaz).
 */
export async function sendReservationDocumentNotifications(
  bookingId: string,
  options?: { clientIp?: string; confirmedAt?: Date }
): Promise<{
  reservationCode: string;
  pdfBytes: number;
  results: ReservationDocumentChannelResult[];
}> {
  const data = await buildReservationDocumentDataForBooking(bookingId, options);
  const results: ReservationDocumentChannelResult[] = [];

  const [company, guestTemplate, followupTemplate, managementTemplate] =
    await Promise.all([
      getCompanySettings(),
      getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_5),
      getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_10_6),
      getAgencyMessageTemplateByRowNo(AGENCY_MESSAGE_TEMPLATE_ROW_20_5),
    ]);
  const values = buildReservationDocumentTemplateValues(data);

  // --- 20.5 Yönetim WhatsApp (Takvim / Evolution) — PDF gerekmez ---
  results.push(
    await sendManagementDocumentWhatsApp({
      template: managementTemplate,
      fallbackTemplate: guestTemplate,
      values,
      brandName: data.company.brandName,
    })
  );

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await buildReservationDocumentPdf(data);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "PDF üretilemedi";
    console.error("[sendReservationDocumentNotifications] PDF fail", {
      bookingId,
      error: msg,
    });
    return {
      reservationCode: data.reservationCode,
      pdfBytes: 0,
      results: [
        ...results,
        { channel: "email", ok: false, error: msg },
        {
          channel: "management_email",
          ok: false,
          error: `PDF üretilemedi; yönetim maili atlandı (${msg})`,
        },
        {
          channel: "whatsapp",
          ok: false,
          error: `PDF üretilemedi; WA atlandı (${msg})`,
        },
      ],
    };
  }

  if (!pdfBuffer.length) {
    return {
      reservationCode: data.reservationCode,
      pdfBytes: 0,
      results: [
        ...results,
        { channel: "email", ok: false, error: "PDF buffer boş üretildi" },
        {
          channel: "management_email",
          ok: false,
          error: "PDF üretilemedi; yönetim maili atlandı",
        },
        { channel: "whatsapp", ok: false, error: "PDF üretilemedi; WA atlandı" },
      ],
    };
  }

  const email = data.guest.email.trim();
  const phoneRaw = data.guest.phone.trim() || "";
  const emailLogo = await prepareCompanyLogoForEmail(
    data.company.logoUrl,
    data.company.domain
  );
  const pdfAttachment: Attachment = {
    filename: `rezervasyon-belgesi-${data.reservationCode}.pdf`,
    content: pdfBuffer,
    contentType: "application/pdf",
  };
  const mailAttachments: Attachment[] = [
    ...(emailLogo.attachments ?? []),
    pdfAttachment,
  ];
  const guestMailText = renderAgencyMessageTemplate(
    pickDocumentChannelBody(guestTemplate, "email"),
    values
  );
  // 20.5 yoksa 10.5 gövdesiyle aynı fallback
  const managementMailText = renderAgencyMessageTemplate(
    pickDocumentChannelBody(managementTemplate ?? guestTemplate, "email"),
    values
  );

  // --- 10.5 Misafir e-posta (PDF) ---
  if (!email || isImportedPlaceholderEmail(email)) {
    results.push({
      channel: "email",
      ok: false,
      error: "Geçerli misafir e-postası yok",
    });
  } else {
    try {
      await sendCompanyMail(company, {
        to: email,
        fromEmail: RESERVATION_DOCUMENT_FROM_EMAIL,
        fromName: resolveDocumentFromName(data),
        // BCC yok — yönetim ayrı 20.5 alır (çift kopya önlenir)
        bcc: "",
        subject: `${data.reservationCode} nolu rezervasyon belgeniz`,
        text: guestMailText,
        html: toHtmlFromText(guestMailText, { logoUrl: emailLogo.src }),
        attachments: mailAttachments,
      });
      results.push({ channel: "email", ok: true });
    } catch (error) {
      results.push({
        channel: "email",
        ok: false,
        error: error instanceof Error ? error.message : "E-posta gönderilemedi",
      });
    }
  }

  // --- 20.5 Yönetim e-posta (aynı gövde + PDF) → info@ ---
  try {
    await sendCompanyMail(company, {
      to: RESERVATION_DOCUMENT_MANAGEMENT_EMAIL,
      fromEmail: RESERVATION_DOCUMENT_FROM_EMAIL,
      fromName: resolveDocumentFromName(data),
      subject: `${data.reservationCode} nolu rezervasyon belgesi (yönetim)`,
      text: managementMailText,
      html: toHtmlFromText(managementMailText, { logoUrl: emailLogo.src }),
      attachments: mailAttachments,
    });
    results.push({ channel: "management_email", ok: true });
  } catch (error) {
    results.push({
      channel: "management_email",
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Yönetim e-postası gönderilemedi",
    });
  }

  // --- 10.5 + 10.6 Misafir WhatsApp (WAHA, sırayla) ---
  if (!phoneRaw?.trim()) {
    results.push({
      channel: "whatsapp",
      ok: false,
      error: "Misafir telefonu yok",
    });
  } else {
    const whatsappMessage = ensureWhatsAppRawConfirmationUrl(
      appendBookingSiteFooter(
        renderAgencyMessageTemplate(
          pickDocumentChannelBody(guestTemplate, "whatsapp"),
          values
        ),
        data.company.brandName
      )
    );
    const followupMessage = renderAgencyMessageTemplate(
      followupTemplate?.whatsappBody?.trim() ||
        RESERVATION_CONFIRMED_FOLLOWUP_WHATSAPP_BODY,
      values
    );
    const wa = await sendCustomerNotificationWhatsAppSequence(phoneRaw, [
      whatsappMessage,
      followupMessage,
    ]);
    results.push({
      channel: "whatsapp",
      ok: wa.ok,
      error: wa.ok ? undefined : wa.error,
    });
  }

  return {
    reservationCode: data.reservationCode,
    pdfBytes: pdfBuffer.length,
    results,
  };
}

