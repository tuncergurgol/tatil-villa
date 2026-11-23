import { prisma } from "@/lib/db";
import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";

/** Misafire giden bilgilendirme şablonları. Yeni villa talebi değilse YumYum karışmaz. */
const GUEST_NOTICE_TEMPLATE_ROWS = [102, 103, 104, 105, 106, 111, 113, 114];
const NOTICE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function looksLikeNewVillaRequest(text: string) {
  const value = text.toLocaleLowerCase("tr-TR");
  if (
    /\b(villa|rezervasyon|rezerv|müsait|musait|uygun|fiyat|konakla|bungalov|balayı|balayi|jakuzi|havuzlu)\b/.test(
      value
    )
  ) {
    return true;
  }
  if (/\d{1,2}\s*[./-]\s*\d{1,2}/.test(value)) return true;
  if (
    /(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)/.test(
      value
    )
  ) {
    return true;
  }
  if (
    /\b(kaş|kas|kalkan|fethiye|ölüdeniz|oludeniz|bodrum|çeşme|cesme|marmaris|göcek|gocek|faralya|ovacık|ovacik|datça|datca)\b/.test(
      value
    )
  ) {
    return true;
  }
  if (/\b\d+\s*(kişi|kisi|gece|yetişkin|yetiskin)\b/.test(value)) return true;
  return false;
}

export async function hasRecentGuestNotice(phone: string) {
  const digits = normalizeTurkishPhoneDigits(phone);
  if (digits.length < 10) return false;
  const since = new Date(Date.now() - NOTICE_WINDOW_MS);
  const logs = await prisma.bookingScheduledMessageLog.findMany({
    where: {
      templateRowNo: { in: GUEST_NOTICE_TEMPLATE_ROWS },
      sentAt: { gte: since },
    },
    orderBy: { sentAt: "desc" },
    take: 400,
    select: { booking: { select: { guestPhone: true } } },
  });
  return logs.some(
    (log) => normalizeTurkishPhoneDigits(log.booking.guestPhone) === digits
  );
}

export async function shouldAssistantReplyToWhatsappGuest(
  phone: string,
  text: string
) {
  if (looksLikeNewVillaRequest(text)) return true;
  if (await hasRecentGuestNotice(phone)) return false;
  return true;
}
