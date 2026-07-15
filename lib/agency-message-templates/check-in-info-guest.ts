export const CHECK_IN_INFO_GUEST_MESSAGE_NAME =
  "Tatilden 1 Gün Önce Rezervasyon Bilgi";

/**
 * Mesaj İçeriği 11.1 (rowNo 111) — WhatsApp / SMS varsayılan gövdesi.
 * DB’deki aktif şablon önceliklidir; seed eksik kayıt için kullanır.
 */
export const CHECK_IN_INFO_GUEST_WHATSAPP_BODY = `Sayın ##MUSTERIADI##,
##REZID## nolu rezervasyonunuz ile ilgili giriş bilgilerinize aşağıdaki linkten ulaşabilirsiniz.
Tatiliniz boyunca her konuda tatil danışmanınızı arayabilirsiniz. İyi tatiller dileriz.
##FİRMAADI##

##MUSTERIGIRIŞBILGILENDIRMELINK##`;

/**
 * E-posta gövdesi — konfirme şablonundaki gibi markdown CTA (yeşil bar).
 * Yanlışlıkla kopyalanmış “rezervasyon talebi” gövdesinin yerine kullanılır.
 */
export const CHECK_IN_INFO_GUEST_MAIL_BODY = `Sayın ##MUSTERIADI##,

##REZID## nolu rezervasyonunuz ile ilgili giriş bilgilerinize aşağıdaki linkten ulaşabilirsiniz.

[GİRİŞ BİLGİLERİNİ GÖRÜNTÜLE](##MUSTERIGIRIŞBILGILENDIRMELINK##)

Tatiliniz boyunca her konuda tatil danışmanınızı arayabilirsiniz. İyi tatiller dileriz.

##FİRMAADI##

Adres: ##ADRES##
Telefon: ##FIRMATEL## | E-mail: ##INFOMAIL##`;

/** DB’de yanlışlıkla kalan “yeni rezervasyon talebi” mail gövdesi mi? */
export function isWrongCheckInInfoMailBody(mailBody: string): boolean {
  const text = mailBody.trim();
  if (!text) return true;
  return /rezervasyon talebiniz bize ulaşmıştır/i.test(text);
}
