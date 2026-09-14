"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIp } from "@/lib/request-client-ip";
import {
  recognizeReturningGuest,
  toReturningGuestPreview,
  type ReturningGuestPreview,
} from "@/lib/returning-guest";

export type LookupReturningGuestResult = {
  match: ReturningGuestPreview | null;
  error?: string;
};

function hasLookupSignal(phone?: string, email?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const mail = (email ?? "").trim();
  return digits.replace(/^90/, "").replace(/^0/, "").length >= 10 || mail.includes("@");
}

export async function lookupReturningGuestAction(input: {
  phone?: string;
  email?: string;
}): Promise<LookupReturningGuestResult> {
  if (!hasLookupSignal(input.phone, input.email)) {
    return { match: null };
  }

  const ip = (await getRequestClientIp()) ?? "unknown";
  const rate = checkRateLimit({
    key: `returning-guest:${ip}`,
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!rate.ok) {
    return { match: null, error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." };
  }

  const match = await recognizeReturningGuest({
    phone: input.phone,
    email: input.email,
  });
  if (!match) return { match: null };

  return { match: toReturningGuestPreview(match) };
}

export async function lookupReturningGuestAdminAction(input: {
  phone?: string;
  email?: string;
}): Promise<LookupReturningGuestResult> {
  await requireAdmin();
  if (!hasLookupSignal(input.phone, input.email)) {
    return { match: null };
  }

  const match = await recognizeReturningGuest({
    phone: input.phone,
    email: input.email,
  });
  if (!match) return { match: null };

  return { match: toReturningGuestPreview(match, { includeFullName: true }) };
}
