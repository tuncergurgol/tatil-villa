export const RESERVATION_DOCUMENT_SENT_MESSAGE_NAME =
  "Rezervasyon Belgesi Gonderildi";

/** Mesaj İçeriği 20.5 — yönetim; gövde 10.5 ile aynı */
export const RESERVATION_DOCUMENT_SENT_MANAGEMENT_MESSAGE_NAME =
  "Rezervasyon Belgesi — Yonetim";

/**
 * Mesaj İçeriği 10.5 (rowNo 105) — misafir konfirme onayından sonra belge bildirimi.
 * Mesaj İçeriği 20.5 (rowNo 205) — aynı mail gövdesi, yönetim (info@).
 * Mail HTML’de üstte rezervasyonun alındığı site logosu basılır (##SITELOGO## metinde boş).
 */
export const RESERVATION_DOCUMENT_SENT_MAIL_BODY = `Sayın ##MUSTERIADI##,

##REZKOD## kodlu rezervasyonunuz konfirme edilmiştir.

Rezervasyon belgeniz (konfirme belgesi ve online rezervasyon sözleşmesi) bu e-postanın ekindedir. Lütfen belgeyi saklayınız.

Tesis: ##TESISADI##
Giriş: ##GIRISTARIHI## ##GIRISSAATI##
Çıkış: ##CIKISTARIHI## ##CIKISSAATI##

Sorularınız için ##FIRMATEL## numaralı telefondan bize ulaşabilirsiniz.
Adres: ##ADRES##
Telefon: ##FIRMATEL## | E-mail: ##INFOMAIL##`;

/**
 * WhatsApp / SMS — PDF e-postada; metin mail ile aynı yapıda.
 */
export const RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY = `Sayın ##MUSTERIADI##,

##REZKOD## kodlu rezervasyonunuz konfirme edilmiştir.

Rezervasyon belgeniz (konfirme belgesi ve online rezervasyon sözleşmesi) e-posta adresinize gönderilmiştir. Lütfen belgeyi saklayınız.

Tesis: ##TESISADI##
Giriş: ##GIRISTARIHI## ##GIRISSAATI##
Çıkış: ##CIKISTARIHI## ##CIKISSAATI##

Sorularınız için ##FIRMATEL## numaralı telefondan bize ulaşabilirsiniz.
Adres: ##ADRES##
Telefon: ##FIRMATEL## | E-mail: ##INFOMAIL##`;

export const RESERVATION_DOCUMENT_SENT_SMS_BODY =
  RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY;
