import { randomBytes } from "crypto";
import type { Booking, BookingStatus, Villa } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendCompanyMail } from "@/lib/email";
import { toHtmlFromText } from "@/lib/email-html";
import { isImportedPlaceholderEmail } from "@/lib/booking-guest-contact";
import {
  appendBookingSiteFooter,
  resolveBookingSiteBrand,
  sanitizePublicBookingDomain,
} from "@/lib/booking-site-brand";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  isValidWhatsAppPhoneE164,
  normalizePhoneToE164,
} from "@/lib/phone";
import { sendCustomerNotificationWhatsApp } from "@/lib/whatsapp-delivery";

export const GUEST_REVIEW_INVITE_TTL_DAYS = 30;

const ELIGIBLE_BOOKING_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "CONFIRMATION_SENT",
  "COMPENSATION",
];

export function generateGuestReviewToken() {
  return randomBytes(24).toString("base64url");
}

export function buildGuestReviewInvitePath(token: string) {
  return `/yorum-yaz/${encodeURIComponent(token)}`;
}

export function buildGuestReviewInviteLink(domain: string, token: string) {
  const host = sanitizePublicBookingDomain(domain);
  const base = host.startsWith("http") ? host : `https://${host}`;
  return `${base.replace(/\/+$/, "")}${buildGuestReviewInvitePath(token)}`;
}

function formatStayMonth(date: Date) {
  return date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

export function buildGuestReviewInviteMessage(input: {
  guestName: string;
  villaName: string;
  link: string;
  brandName: string;
}) {
  const name = input.guestName.trim() || "Değerli Misafirimiz";
  return `Merhaba ${name},

${input.villaName} konaklamanız için teşekkür ederiz. Deneyiminizi birkaç dakikada paylaşır mısınız?

Yorum linkiniz:
${input.link}

${input.brandName}`;
}

export async function ensureGuestReviewInvitation(bookingId: string) {
  const existing = await prisma.guestReviewInvitation.findUnique({
    where: { bookingId },
  });
  if (existing) return existing;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + GUEST_REVIEW_INVITE_TTL_DAYS);

  return prisma.guestReviewInvitation.create({
    data: {
      bookingId,
      token: generateGuestReviewToken(),
      expiresAt,
    },
  });
}

type BookingForInvite = Booking & {
  villa: Pick<Villa, "id" | "name" | "originalName">;
};

export async function loadBookingForGuestReviewInvite(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      villa: { select: { id: true, name: true, originalName: true } },
      guestReviewInvitation: true,
      guestReview: { select: { id: true } },
    },
  });
}

export type GuestReviewInviteSendResult = {
  ok: boolean;
  link: string;
  emailSent: boolean;
  whatsappSent: boolean;
  errors: string[];
};

export async function sendGuestReviewInviteForBooking(
  bookingId: string,
  options?: { forceResend?: boolean }
): Promise<GuestReviewInviteSendResult> {
  const booking = await loadBookingForGuestReviewInvite(bookingId);
  if (!booking) {
    return { ok: false, link: "", emailSent: false, whatsappSent: false, errors: ["Rezervasyon bulunamadı"] };
  }

  if (!ELIGIBLE_BOOKING_STATUSES.includes(booking.status)) {
    return {
      ok: false,
      link: "",
      emailSent: false,
      whatsappSent: false,
      errors: ["Yalnızca onaylı rezervasyonlara yorum daveti gönderilebilir"],
    };
  }

  if (booking.guestReview) {
    return {
      ok: false,
      link: "",
      emailSent: false,
      whatsappSent: false,
      errors: ["Bu rezervasyon için yorum zaten gönderilmiş"],
    };
  }

  const company = await getCompanySettings();
  if (!company.guestReviewInvitesEnabled) {
    return {
      ok: false,
      link: "",
      emailSent: false,
      whatsappSent: false,
      errors: ["Misafir yorum davetleri kapalı"],
    };
  }

  const invitation = await ensureGuestReviewInvitation(bookingId);
  if (invitation.usedAt) {
    return {
      ok: false,
      link: "",
      emailSent: false,
      whatsappSent: false,
      errors: ["Davet linki zaten kullanılmış"],
    };
  }

  const details = parseBookingDetails(booking.details);
  const brand = resolveBookingSiteBrand({
    siteInfo: details.siteInfo,
    originDomain: details.originDomain,
    company,
    agencySites: [],
  });
  const link = buildGuestReviewInviteLink(brand.domain, invitation.token);
  const villaName = booking.villa.originalName || booking.villa.name;
  const message = buildGuestReviewInviteMessage({
    guestName: booking.guestName,
    villaName,
    link,
    brandName: brand.siteInfo || company.brandName || "Tatildeyiz",
  });

  const errors: string[] = [];
  let emailSent = Boolean(invitation.emailSentAt);
  let whatsappSent = Boolean(invitation.whatsappSentAt);

  const shouldSendEmail =
    options?.forceResend || !invitation.emailSentAt;
  const shouldSendWhatsApp =
    options?.forceResend || !invitation.whatsappSentAt;

  if (shouldSendEmail && !isImportedPlaceholderEmail(booking.guestEmail)) {
    try {
      await sendCompanyMail(company, {
        to: booking.guestEmail,
        subject: `${villaName} konaklamanız — yorumunuz bizim için değerli`,
        text: message,
        html: toHtmlFromText(message),
      });
      emailSent = true;
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "E-posta gönderilemedi"
      );
    }
  }

  const phone = normalizePhoneToE164(booking.guestPhone);
  if (shouldSendWhatsApp && phone && isValidWhatsAppPhoneE164(phone)) {
    const wa = await sendCustomerNotificationWhatsApp(
      phone,
      appendBookingSiteFooter(message, brand.siteInfo)
    );
    if (wa.ok) {
      whatsappSent = true;
    } else {
      errors.push(wa.error ?? "WhatsApp gönderilemedi");
    }
  }

  if (emailSent || whatsappSent) {
    await prisma.guestReviewInvitation.update({
      where: { id: invitation.id },
      data: {
        emailSentAt: emailSent ? new Date() : invitation.emailSentAt,
        whatsappSentAt: whatsappSent ? new Date() : invitation.whatsappSentAt,
      },
    });
  }

  return {
    ok: emailSent || whatsappSent,
    link,
    emailSent,
    whatsappSent,
    errors,
  };
}

/** Çıkışı geçmiş, daveti gönderilmemiş onaylı rezervasyonlar. */
export async function findBookingsNeedingReviewInvite(limit = 20) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lookback = new Date(today);
  lookback.setDate(lookback.getDate() - 7);

  return prisma.booking.findMany({
    where: {
      status: { in: ELIGIBLE_BOOKING_STATUSES },
      checkOut: { gte: lookback, lt: today },
      guestReview: { is: null },
      OR: [
        { guestReviewInvitation: { is: null } },
        {
          guestReviewInvitation: {
            emailSentAt: null,
            whatsappSentAt: null,
            usedAt: null,
          },
        },
      ],
    },
    orderBy: { checkOut: "asc" },
    take: limit,
    select: { id: true, externalCode: true, guestName: true, checkOut: true },
  });
}

export async function runScheduledGuestReviewInvites() {
  const company = await getCompanySettings();
  if (!company.guestReviewInvitesEnabled) {
    return { ok: false, message: "Misafir yorum davetleri kapalı", sent: 0 };
  }

  const bookings = await findBookingsNeedingReviewInvite(15);
  if (bookings.length === 0) {
    return { ok: true, message: "Gönderilecek davet yok", sent: 0 };
  }

  let sent = 0;
  const failures: string[] = [];

  for (const booking of bookings) {
    const result = await sendGuestReviewInviteForBooking(booking.id);
    if (result.ok) {
      sent += 1;
    } else if (result.errors.length > 0) {
      failures.push(
        `${booking.externalCode ?? booking.id}: ${result.errors.join(", ")}`
      );
    }
  }

  return {
    ok: sent > 0 || failures.length === 0,
    message:
      sent > 0
        ? `${sent} misafire yorum daveti gönderildi`
        : failures[0] ?? "Davet gönderilemedi",
    sent,
    failures,
  };
}

export function formatGuestReviewStayMonth(checkOut: Date) {
  return formatStayMonth(checkOut);
}
