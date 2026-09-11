/**
 * Banka Havale/EFT ön ödeme WhatsApp akışı:
 * 1) Özet mesaj
 * 2) Şirket ünvanı
 * 3) IBAN
 * 4) Ödenecek tutar
 * 5) Havale açıklaması
 * 6) Açıklama hatırlatması
 *
 * (Müşteriye özel selamlama gönderilmez.)
 */
export function buildBankTransferWhatsAppParts(input: {
  summaryMessage: string;
  companyTitle: string;
  iban: string;
  amountText: string;
  guestName: string;
  reservationCode: string;
}): string[] {
  const companyTitle = input.companyTitle.trim();
  const iban = input.iban.trim().replace(/\s+/g, "");
  const amount = input.amountText.trim();
  const guestName = input.guestName.trim() || "Misafir";
  const code = input.reservationCode.trim() || "—";
  const description = `${guestName} ${code} nolu rezervasyon ödemesi`;

  const parts = [
    input.summaryMessage.trim(),
    companyTitle,
    iban,
    amount,
    description,
    "Açıklama kısmına yazmanız gerekli efendim",
  ].filter((part) => part.length > 0);

  return parts;
}
