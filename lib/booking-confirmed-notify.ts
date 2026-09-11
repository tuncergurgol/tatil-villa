/**
 * Misafir konfirmasyon onayı sonrası Mesaj 202 (yönetim mail + takvim WA).
 *
 * Şimdilik PASİF: yönetim kopyası Mesaj 20.5 ile
 * `sendReservationDocumentNotifications` üzerinden info@tatildeyiz.com.tr'ye gider.
 * Yeniden açmak için `confirmBookingGuestInfo` içinde bu fonksiyonu tekrar çağırın.
 */
export async function notifyBookingConfirmedByGuest(
  bookingId: string
): Promise<void> {
  console.info(
    "[booking-confirmed-notify] pasif (20.5 yönetim maili kullanılıyor)",
    bookingId
  );
}
