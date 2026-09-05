import { formatMoneyPlain } from "@/lib/booking-display";
import { countNightsBetween } from "@/lib/villa-period-selection";

export type NewBookingWhatsAppSharePayload = {
  villaName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  babies: number;
  accommodationTotal: number | null;
  ownerDiscountAmount?: number | null;
  agencyDiscountAmount?: number | null;
  cleaningFee?: number | null;
  underfloorHeatingFee?: number | null;
  reservationTotal: number | null;
  prepaymentAmount: number | null;
  prepaymentRate: number;
  entrancePayment: number | null;
  damageDeposit?: number | null;
  guestName?: string | null;
};

function formatDateTr(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString("tr-TR");
}

function moneyLine(label: string, amount: number | null | undefined, negative = false) {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  const value = formatMoneyPlain(amount);
  return `${label}: ${negative ? `-${value}` : value}`;
}

/** Yeni rezervasyon sihirbazı — WhatsApp teklif/özet metni */
export function buildNewBookingWhatsAppShareMessage(
  input: NewBookingWhatsAppSharePayload
): string {
  const nights =
    input.checkIn && input.checkOut
      ? countNightsBetween(input.checkIn, input.checkOut)
      : 0;
  const guestCount = input.adults + input.children + input.babies;
  const guestName = input.guestName?.trim();
  const greeting = guestName ? `Merhaba ${guestName},` : "Merhaba,";

  const lines = [
    greeting,
    "",
    `${input.villaName} için rezervasyon özeti:`,
    "",
    `${formatDateTr(input.checkIn)} – ${formatDateTr(input.checkOut)}`,
    `${nights} Gece · ${guestCount} Misafir`,
    "",
    moneyLine(`Konaklama (${nights} Gece)`, input.accommodationTotal),
    moneyLine("Villa Sahibi İndirimi", input.ownerDiscountAmount, true),
    moneyLine("Acente İndirimi", input.agencyDiscountAmount, true),
    moneyLine("Temizlik Ücreti", input.cleaningFee),
    moneyLine("Yerden Isıtma Bedeli", input.underfloorHeatingFee),
    "",
    moneyLine("Toplam", input.reservationTotal),
    moneyLine(`Ön Ödeme (%${input.prepaymentRate})`, input.prepaymentAmount),
    moneyLine("Giriş Ödemesi (Kalan)", input.entrancePayment),
    moneyLine("Hasar Depozitosu", input.damageDeposit),
  ];

  return lines.filter((line) => line != null).join("\n").trim();
}
