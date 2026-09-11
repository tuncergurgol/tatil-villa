import { Prisma } from "@prisma/client";
import type { BookingDetails } from "@/lib/booking-form-details";
import { prisma } from "@/lib/db";
import {
  buildActivityLogEntry,
  normalizeActivityLogs,
  type BookingActivityAction,
  type BookingActivityLogEntry,
} from "@/lib/booking-activity-log-core";

export type {
  BookingActivityAction,
  BookingActivityLogEntry,
} from "@/lib/booking-activity-log-core";

export {
  buildActivityLogEntry,
  buildLegacyCreatedLog,
  getBookingActivityActionLabel,
  normalizeActivityLogs,
  statusChangedMessage,
  withInitialActivityLog,
} from "@/lib/booking-activity-log-core";

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
