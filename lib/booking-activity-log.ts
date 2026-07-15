import { Prisma } from "@prisma/client";
import type { BookingStatus } from "@prisma/client";
import { getBookingStatusLabel } from "@/lib/booking-status";
import type { BookingDetails } from "@/lib/booking-form-details";
import { prisma } from "@/lib/db";

export type BookingActivityAction =
  | "booking_created"
  | "booking_updated"
  | "prepayment_shared"
  | "prepayment_created"
  | "prepayment_updated"
  | "prepayment_deleted"
  | "confirmation_sent"
  | "guest_confirmed"
  | "reservation_document_sent"
  | "status_changed"
  | "owner_payment_created"
  | "owner_payment_updated"
  | "owner_payment_deleted"
  | "invoice_saved"
  | "check_in_info_shared";

export type BookingActivityLogEntry = {
  id: string;
  at: string;
  action: BookingActivityAction;
  message: string;
  actorUserId?: string | null;
  actorName: string;
  meta?: Record<string, string | number | boolean | null>;
};

const ACTION_LABELS: Record<BookingActivityAction, string> = {
  booking_created: "Rezervasyon oluşturuldu",
  booking_updated: "Rezervasyon formu kaydedildi",
  prepayment_shared: "Ön ödeme bilgisi paylaşıldı",
  prepayment_created: "Ön ödeme kaydı eklendi",
  prepayment_updated: "Ön ödeme kaydı güncellendi",
  prepayment_deleted: "Ön ödeme kaydı silindi",
  confirmation_sent: "Konfirme gönderildi",
  guest_confirmed: "Misafir onayı tamamlandı",
  reservation_document_sent: "Konfirme belgesi gönderildi",
  status_changed: "Durum değiştirildi",
  owner_payment_created: "Villa sahibine ödeme eklendi",
  owner_payment_updated: "Villa sahibine ödeme güncellendi",
  owner_payment_deleted: "Villa sahibine ödeme silindi",
  invoice_saved: "Fatura bilgileri kaydedildi",
  check_in_info_shared: "Giriş bilgilendirme gönderildi",
};

export function getBookingActivityActionLabel(
  action: BookingActivityAction
): string {
  return ACTION_LABELS[action] ?? action;
}

export function normalizeActivityLogs(
  value: unknown
): BookingActivityLogEntry[] {
  if (!Array.isArray(value)) return [];
  const rows: BookingActivityLogEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const at = typeof row.at === "string" ? row.at.trim() : "";
    const action = row.action;
    const message = typeof row.message === "string" ? row.message.trim() : "";
    const actorName =
      typeof row.actorName === "string" && row.actorName.trim()
        ? row.actorName.trim()
        : "Sistem";
    if (!id || !at || typeof action !== "string" || !message) continue;
    rows.push({
      id,
      at,
      action: action as BookingActivityAction,
      message,
      actorUserId:
        typeof row.actorUserId === "string" ? row.actorUserId : null,
      actorName,
      meta:
        row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
          ? (row.meta as BookingActivityLogEntry["meta"])
          : undefined,
    });
  }
  // En yeni üstte — Date ile karşılaştır (ekleme sırasına güvenme)
  return rows.sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    const na = Number.isFinite(ta) ? ta : 0;
    const nb = Number.isFinite(tb) ? tb : 0;
    if (nb !== na) return nb - na;
    return b.id.localeCompare(a.id);
  });
}

export function buildActivityLogEntry(input: {
  action: BookingActivityAction;
  message?: string;
  actorUserId?: string | null;
  actorName?: string | null;
  meta?: BookingActivityLogEntry["meta"];
}): BookingActivityLogEntry {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    action: input.action,
    message: input.message?.trim() || getBookingActivityActionLabel(input.action),
    actorUserId: input.actorUserId ?? null,
    actorName: input.actorName?.trim() || "Sistem",
    meta: input.meta,
  };
}

export async function resolveActivityActor(sessionUser?: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
} | null): Promise<{ actorUserId: string | null; actorName: string }> {
  const id = sessionUser?.id?.trim() || "";
  const email = sessionUser?.email?.trim() || "";
  const fallbackName = sessionUser?.name?.trim() || "Sistem";

  if (id) {
    const byId = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (byId) {
      return {
        actorUserId: byId.id,
        actorName: byId.name.trim() || fallbackName,
      };
    }
  }

  // JWT sub eski/yeniden oluşturulmuş kullanıcıda kaybolabilir — e-posta ile çöz
  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (byEmail) {
      return {
        actorUserId: byEmail.id,
        actorName: byEmail.name.trim() || fallbackName,
      };
    }
  }

  const name = sessionUser?.name?.trim() || "";
  if (name && name !== "Sistem") {
    const matches = await prisma.user.findMany({
      where: { name, active: true },
      select: { id: true, name: true },
      take: 2,
    });
    if (matches.length === 1) {
      return {
        actorUserId: matches[0]!.id,
        actorName: matches[0]!.name.trim() || name,
      };
    }
  }

  return {
    actorUserId: id || null,
    actorName: fallbackName,
  };
}

/** details JSON içine log ekler (atomik okuma-yazma) */
export async function appendBookingActivityLog(
  bookingId: string,
  entryInput: {
    action: BookingActivityAction;
    message?: string;
    actorUserId?: string | null;
    actorName?: string | null;
    meta?: BookingActivityLogEntry["meta"];
  }
): Promise<BookingActivityLogEntry[]> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { details: true },
  });
  if (!booking) return [];

  const details = (
    booking.details &&
    typeof booking.details === "object" &&
    !Array.isArray(booking.details)
      ? booking.details
      : {}
  ) as BookingDetails;
  const entry = buildActivityLogEntry(entryInput);
  const activityLogs = normalizeActivityLogs([
    ...normalizeActivityLogs(details.activityLogs),
    entry,
  ]);

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      details: {
        ...details,
        activityLogs,
      } as Prisma.InputJsonValue,
    },
  });

  return activityLogs;
}

export function withInitialActivityLog(
  details: Record<string, unknown> | BookingDetails | undefined,
  entry: BookingActivityLogEntry
): Record<string, unknown> {
  const base = { ...(details ?? {}) };
  const existing = normalizeActivityLogs(
    (base as BookingDetails).activityLogs
  );
  return {
    ...base,
    activityLogs: normalizeActivityLogs([...existing, entry]),
  };
}

export function statusChangedMessage(
  from: BookingStatus | null | undefined,
  to: BookingStatus
): string {
  const toLabel = getBookingStatusLabel(to);
  if (!from) return `Durum "${toLabel}" olarak güncellendi`;
  return `Durum "${getBookingStatusLabel(from)}" → "${toLabel}"`;
}

/** Eski kayıtlarda log yoksa oluşturma satırı üret */
export function buildLegacyCreatedLog(input: {
  createdAt: Date | string;
  guestName?: string;
}): BookingActivityLogEntry {
  return {
    id: "legacy-created",
    at: new Date(input.createdAt).toISOString(),
    action: "booking_created",
    message: input.guestName
      ? `Rezervasyon oluşturuldu (${input.guestName})`
      : "Rezervasyon oluşturuldu",
    actorUserId: null,
    actorName: "Sistem",
  };
}
